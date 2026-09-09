//! Credit holds + anonymous budget.
//!
//! Reserve-before-stream: the gateway moves an estimate from `balance` into
//! `held` atomically; insufficient funds reject the request before any LLM
//! spend. The Python metering worker later reconciles actuals against the
//! hold. Anonymous users get a windowed Redis budget (no PG hot path).

use sqlx::PgPool;
use uuid::Uuid;

/// Outcome of a keyed reservation attempt.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReserveOutcome {
    /// Funds moved to held; proceed with generation.
    Reserved,
    /// This Idempotency-Key already reserved — replay; original decision
    /// stands (proceed) without touching funds.
    Duplicate,
    /// Insufficient balance.
    Insufficient,
}

/// Atomically move `amount` from balance to held, recording a hold row.
///
/// When `idempotency_key` is supplied and a hold already exists for it, the
/// request is a replay: `Duplicate` is returned and funds are untouched
/// (retries never double-charge).
pub async fn reserve_keyed(
    db: &PgPool,
    user_id: Uuid,
    amount: f64,
    idempotency_key: Option<&str>,
) -> Result<ReserveOutcome, sqlx::Error> {
    use super::postgres::billing_repo;

    let mut tx = db.begin().await?;

    // C1 fix: EVERY reservation creates a hold row. When no client key is
    // provided, insert an unkeyed hold so the funds are always trackable
    // and releasable (previously: balance→held with no row = stranded funds).
    match idempotency_key {
        Some(key) => {
            let won = billing_repo::insert_hold(&mut tx, user_id, amount, key).await?;
            if !won {
                return Ok(ReserveOutcome::Duplicate);
            }
        }
        None => {
            billing_repo::insert_hold_unkeyed(&mut tx, user_id, amount).await?;
        }
    }

    let moved = billing_repo::move_to_hold_tx(&mut tx, user_id, amount).await?;
    if !moved {
        return Ok(ReserveOutcome::Insufficient);
    }

    tx.commit().await?;
    Ok(ReserveOutcome::Reserved)
}

/// Release an open hold back to balance (stream failed before generation).
pub async fn release_by_key(db: &PgPool, user_id: Uuid, key: &str) -> Result<(), sqlx::Error> {
    use super::postgres::billing_repo;

    let mut tx = db.begin().await?;
    if let Some(hold) = billing_repo::get_open_hold(&mut tx, user_id, key).await? {
        billing_repo::refund_held(&mut tx, user_id, hold.amount.unwrap_or(0.0)).await?;
        billing_repo::mark_hold_released(&mut tx, key).await?;
    }
    tx.commit().await?;
    Ok(())
}

/// Windowed anonymous budget in Redis: true = allowed.
/// Fail-open on Redis outage (governor burst limits still apply).
pub async fn anon_budget_allow(
    redis: &crate::infra::redis::RedisHandle,
    ip_hash: &str,
    free_messages: i64,
    window_secs: u64,
) -> bool {
    let key = format!("ot:api:anon:{ip_hash}");
    // P4.L5: INCR + EXPIRE must be atomic — a crash between the two commands
    // would leave a counter with no TTL, permanently blocking the IP. Run both
    // inside one Lua script so the window can never leak.
    const SCRIPT: &str = "local n = redis.call('INCR', KEYS[1])\nif n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end\nreturn n";
    match redis
        .exec(move |mut c| async move {
            let n: i64 = redis::cmd("EVAL")
                .arg(SCRIPT)
                .arg(1)
                .arg(&key)
                .arg(window_secs)
                .query_async(&mut c)
                .await?;
            Ok(n)
        })
        .await
    {
        Ok(n) => n <= free_messages,
        Err(e) => {
            tracing::warn!(error = %e, "anon budget degraded; failing open");
            true
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db_url() -> Option<String> {
        std::env::var("DATABASE_URL")
            .ok()
            .filter(|v| !v.trim().is_empty())
    }

    async fn pool() -> Option<PgPool> {
        let url = db_url()?;
        Some(
            sqlx::postgres::PgPoolOptions::new()
                .max_connections(10)
                .connect(&url)
                .await
                .expect("connect"),
        )
    }

    /// R1 gate: N concurrent reserves with the SAME Idempotency-Key — exactly
    /// one moves funds, the rest are duplicates; release restores balance.
    #[tokio::test]
    async fn keyed_reserve_race_and_replay() {
        let Some(db) = pool().await else {
            eprintln!("skipped: DATABASE_URL not set");
            return;
        };

        // Ephemeral user + funded balance (no FK on holds beyond users).
        let user_id = uuid::Uuid::new_v4();
        sqlx::query("INSERT INTO users (id, email) VALUES ($1, $2)")
            .bind(user_id)
            .bind(format!("hold-race-{user_id}@gate.local"))
            .execute(&db)
            .await
            .unwrap();
        sqlx::query("INSERT INTO user_credit_balances (user_id, balance) VALUES ($1, 1000.0)")
            .bind(user_id)
            .execute(&db)
            .await
            .unwrap();

        let key = format!("gate-{}", uuid::Uuid::new_v4());
        let mut handles = Vec::new();
        for _ in 0..8 {
            let db_c = db.clone();
            let key_c = key.clone();
            handles.push(tokio::spawn(async move {
                reserve_keyed(&db_c, user_id, 250.0, Some(&key_c)).await
            }));
        }
        let mut reserved = 0;
        let mut duplicates = 0;
        for h in handles {
            match h.await.unwrap().unwrap() {
                ReserveOutcome::Reserved => reserved += 1,
                ReserveOutcome::Duplicate => duplicates += 1,
                ReserveOutcome::Insufficient => panic!("unexpected insufficient"),
            }
        }
        assert_eq!(reserved, 1, "exactly one reservation must win the race");
        assert_eq!(duplicates, 7);

        // Replay after completion still dedupes.
        assert_eq!(
            reserve_keyed(&db, user_id, 250.0, Some(&key)).await.unwrap(),
            ReserveOutcome::Duplicate
        );

        // Funds: 1000.00 - 250.00 in balance, 250.00 held.
        use sqlx::Row;
        let row = sqlx::query(
            r#"SELECT balance::float8 AS b, held::float8 AS h
               FROM user_credit_balances WHERE user_id = $1"#,
        )
        .bind(user_id)
        .fetch_one(&db)
        .await
        .unwrap();
        let b: f64 = row.get("b");
        let h: f64 = row.get("h");
        assert!((b - 750.0).abs() < 1e-6 && (h - 250.0).abs() < 1e-6);

        // Release restores.
        release_by_key(&db, user_id, &key).await.unwrap();
        let row = sqlx::query(
            r#"SELECT balance::float8 AS b, held::float8 AS h
               FROM user_credit_balances WHERE user_id = $1"#,
        )
        .bind(user_id)
        .fetch_one(&db)
        .await
        .unwrap();
        let b: f64 = row.get("b");
        let h: f64 = row.get("h");
        assert!((b - 1000.0).abs() < 1e-6 && h.abs() < 1e-6);
        let status: String =
            sqlx::query_scalar("SELECT status FROM credit_holds WHERE idempotency_key = $1")
                .bind(&key)
                .fetch_one(&db)
                .await
                .unwrap();
        assert_eq!(status, "released");

        // cleanup
        sqlx::query("DELETE FROM credit_holds WHERE user_id = $1")
            .bind(user_id)
            .execute(&db)
            .await
            .unwrap();
        sqlx::query("DELETE FROM user_credit_balances WHERE user_id = $1")
            .bind(user_id)
            .execute(&db)
            .await
            .unwrap();
        sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user_id)
            .execute(&db)
            .await
            .unwrap();
        db.close().await;
    }
}
