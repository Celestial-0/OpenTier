//! Billing-domain SQL (R2: statements live only under infra::postgres).
//! Orchestration stays in `infra::billing`; this module owns every statement.

use uuid::Uuid;

/// Insert-first keyed hold. UNIQUE(user_id, idempotency_key) arbitrates
/// replays per-user. Stale holds (>1h) or non-open holds are reclaimed.
/// Returns false when a fresh duplicate exists (caller ⇒ Duplicate).
pub async fn insert_hold(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    amount: f64,
    idempotency_key: &str,
) -> Result<bool, sqlx::Error> {
    let row = sqlx::query!(
        r#"
        INSERT INTO credit_holds (user_id, amount, idempotency_key)
        VALUES ($1, $2::float8, $3)
        ON CONFLICT (user_id, idempotency_key) DO UPDATE
        SET amount = EXCLUDED.amount,
            status = 'open',
            created_at = NOW()
        WHERE credit_holds.status != 'open'
           OR credit_holds.created_at < NOW() - INTERVAL '1 hour'
        RETURNING id
        "#,
        user_id,
        amount,
        idempotency_key,
    )
    .fetch_optional(&mut **tx)
    .await?;
    Ok(row.is_some())
}

/// Unkeyed hold for requests without an Idempotency-Key header.
/// Always inserts fresh (no dedupe possible without a client key).
pub async fn insert_hold_unkeyed(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    amount: f64,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "INSERT INTO credit_holds (user_id, amount) VALUES ($1, $2::float8)",
        user_id,
        amount,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Conditional balance→held move inside the caller's transaction.
pub async fn move_to_hold_tx(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    amount: f64,
) -> Result<bool, sqlx::Error> {
    let row = sqlx::query!(
        r#"
        UPDATE user_credit_balances
        SET balance = balance - $1::float8, held = held + $1::float8,
            version = version + 1
        WHERE user_id = $2 AND balance >= $1::float8
        RETURNING 1 AS ok
        "#,
        amount,
        user_id,
    )
    .fetch_optional(&mut **tx)
    .await?;
    Ok(row.is_some())
}

pub struct OpenHold {
    pub amount: Option<f64>,
}

/// Fetch and lock an open hold for release.
pub async fn get_open_hold(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    key: &str,
) -> Result<Option<OpenHold>, sqlx::Error> {
    sqlx::query_as!(
        OpenHold,
        r#"
        SELECT amount::float8 AS "amount" FROM credit_holds
        WHERE idempotency_key = $1 AND user_id = $2 AND status = 'open'
        FOR UPDATE
        "#,
        key,
        user_id,
    )
    .fetch_optional(&mut **tx)
    .await
}

/// Refund up to `amount` from held back to balance.
pub async fn refund_held(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    amount: f64,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE user_credit_balances
        SET balance = balance + LEAST(held, $1::float8),
            held = held - LEAST(held, $1::float8),
            version = version + 1
        WHERE user_id = $2
        "#,
        amount,
        user_id,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn mark_hold_released(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    key: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "UPDATE credit_holds SET status = 'released' \
         WHERE idempotency_key = $1 AND status = 'open'",
        key,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Ensure user has a record in `user_credit_balances`. If missing, initializes with 10.0000 free credits.
pub async fn ensure_user_balance_initialized(
    db: &sqlx::PgPool,
    user_id: Uuid,
) -> Result<(), sqlx::Error> {
    let mut tx = db.begin().await?;
    let inserted = sqlx::query!(
        r#"
        INSERT INTO user_credit_balances (user_id, balance, held)
        VALUES ($1, 10.0000, 0.0000)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING user_id
        "#,
        user_id
    )
    .fetch_optional(&mut *tx)
    .await?;

    if inserted.is_some() {
        let idem_key = format!("signup-fallback-{}", user_id);
        sqlx::query!(
            r#"
            INSERT INTO credit_transactions (
                user_id, delta, balance_after, reason, idempotency_key, metadata
            )
            VALUES ($1, 10.0000, 10.0000, 'signup_bonus', $2, '{"note": "Initial free signup credits fallback grant"}'::jsonb)
            ON CONFLICT (idempotency_key) DO NOTHING
            "#,
            user_id,
            idem_key
        )
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct UserCreditSummary {
    pub balance: f64,
    pub held: f64,
    pub total_spent: f64,
    pub total_granted: f64,
    pub total_tokens_in: i64,
    pub total_tokens_out: i64,
    pub total_messages: i64,
}

pub async fn get_user_credit_summary(
    db: &sqlx::PgPool,
    user_id: Uuid,
) -> Result<UserCreditSummary, sqlx::Error> {
    ensure_user_balance_initialized(db, user_id).await?;

    let row = sqlx::query!(
        r#"
        SELECT
            COALESCE(b.balance::float8, 0.0) AS "balance!",
            COALESCE(b.held::float8, 0.0) AS "held!",
            COALESCE(SUM(CASE WHEN t.delta < 0 THEN ABS(t.delta::float8) ELSE 0 END), 0.0)::float8 AS "total_spent!",
            COALESCE(SUM(CASE WHEN t.delta > 0 THEN t.delta::float8 ELSE 0 END), 0.0)::float8 AS "total_granted!",
            COALESCE(SUM(t.tokens_in)::int8, 0) AS "total_tokens_in!",
            COALESCE(SUM(t.tokens_out)::int8, 0) AS "total_tokens_out!",
            COALESCE(COUNT(CASE WHEN t.reason = 'usage' THEN 1 END)::int8, 0) AS "total_messages!"
        FROM user_credit_balances b
        LEFT JOIN credit_transactions t ON t.user_id = b.user_id
        WHERE b.user_id = $1
        GROUP BY b.balance, b.held
        "#,
        user_id
    )
    .fetch_one(db)
    .await?;

    Ok(UserCreditSummary {
        balance: row.balance,
        held: row.held,
        total_spent: row.total_spent,
        total_granted: row.total_granted,
        total_tokens_in: row.total_tokens_in,
        total_tokens_out: row.total_tokens_out,
        total_messages: row.total_messages,
    })
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CreditTransactionItem {
    pub id: Uuid,
    pub delta: f64,
    pub balance_after: f64,
    pub reason: String,
    pub model_name: Option<String>,
    pub model_slug: Option<String>,
    pub tokens_in: i32,
    pub tokens_out: i32,
    pub cost_input: f64,
    pub cost_output: f64,
    pub conversation_id: Option<Uuid>,
    #[serde(with = "crate::common::timestamp")]
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn list_user_credit_transactions(
    db: &sqlx::PgPool,
    user_id: Uuid,
    limit: i64,
    offset: i64,
    reason_filter: Option<String>,
) -> Result<(Vec<CreditTransactionItem>, i64), sqlx::Error> {
    let rows = sqlx::query_as!(
        CreditTransactionItem,
        r#"
        SELECT
            t.id,
            t.delta::float8 AS "delta!",
            t.balance_after::float8 AS "balance_after!",
            t.reason AS "reason!",
            m.display_name AS "model_name?",
            m.slug AS "model_slug?",
            t.tokens_in AS "tokens_in!",
            t.tokens_out AS "tokens_out!",
            t.cost_input::float8 AS "cost_input!",
            t.cost_output::float8 AS "cost_output!",
            t.conversation_id AS "conversation_id?",
            t.created_at AS "created_at!"
        FROM credit_transactions t
        LEFT JOIN models m ON m.id = t.model_id
        WHERE t.user_id = $1
          AND ($4::text IS NULL OR t.reason = $4)
        ORDER BY t.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        user_id,
        limit,
        offset,
        reason_filter
    )
    .fetch_all(db)
    .await?;

    let total = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*)::int8 FROM credit_transactions
        WHERE user_id = $1 AND ($2::text IS NULL OR reason = $2)
        "#,
        user_id,
        reason_filter
    )
    .fetch_one(db)
    .await?
    .unwrap_or(0);

    Ok((rows, total))
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ModelUsageItem {
    pub model_name: String,
    pub model_slug: String,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub total_cost: f64,
    pub request_count: i64,
}

pub async fn get_user_usage_by_model(
    db: &sqlx::PgPool,
    user_id: Uuid,
) -> Result<Vec<ModelUsageItem>, sqlx::Error> {
    let rows = sqlx::query_as!(
        ModelUsageItem,
        r#"
        SELECT
            COALESCE(m.display_name, 'Unknown Model') AS "model_name!",
            COALESCE(m.slug, 'unknown') AS "model_slug!",
            COALESCE(SUM(t.tokens_in)::int8, 0) AS "tokens_in!",
            COALESCE(SUM(t.tokens_out)::int8, 0) AS "tokens_out!",
            COALESCE(SUM(ABS(t.delta::float8)), 0.0)::float8 AS "total_cost!",
            COALESCE(COUNT(*)::int8, 0) AS "request_count!"
        FROM credit_transactions t
        LEFT JOIN models m ON m.id = t.model_id
        WHERE t.user_id = $1 AND t.reason = 'usage'
        GROUP BY m.display_name, m.slug
        ORDER BY "total_cost!" DESC
        "#,
        user_id
    )
    .fetch_all(db)
    .await?;

    Ok(rows)
}

pub async fn admin_adjust_user_credits(
    db: &sqlx::PgPool,
    user_id: Uuid,
    delta: f64,
    reason: &str,
    note: Option<String>,
) -> Result<(f64, Uuid), sqlx::Error> {
    let mut tx = db.begin().await?;

    // Ensure user has initial credit record
    sqlx::query!(
        r#"
        INSERT INTO user_credit_balances (user_id, balance, held)
        VALUES ($1, 0.0000, 0.0000)
        ON CONFLICT (user_id) DO NOTHING
        "#,
        user_id
    )
    .execute(&mut *tx)
    .await?;

    let row = sqlx::query!(
        r#"
        UPDATE user_credit_balances
        SET balance = balance + $2::float8,
            version = version + 1
        WHERE user_id = $1
        RETURNING balance::float8 AS "balance!"
        "#,
        user_id,
        delta
    )
    .fetch_one(&mut *tx)
    .await?;

    let new_balance = row.balance;
    let idem_key = format!("admin-adj-{}-{}", user_id, uuid::Uuid::new_v4());
    let metadata = serde_json::json!({
        "note": note.unwrap_or_default(),
        "adjusted_by": "admin"
    });

    let tx_row = sqlx::query!(
        r#"
        INSERT INTO credit_transactions (
            user_id, delta, balance_after, reason, idempotency_key, metadata
        )
        VALUES ($1, $2::float8, $3::float8, $4, $5, $6)
        RETURNING id
        "#,
        user_id,
        delta,
        new_balance,
        reason,
        idem_key,
        metadata
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok((new_balance, tx_row.id))
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlatformCreditsStats {
    pub total_balance_circulating: f64,
    pub total_held: f64,
    pub total_burned_lifetime: f64,
    pub total_granted_lifetime: f64,
    pub active_funded_users: i64,
    pub burned_24h: f64,
    pub granted_24h: f64,
}

pub async fn get_platform_credits_stats(
    db: &sqlx::PgPool,
) -> Result<PlatformCreditsStats, sqlx::Error> {
    let row = sqlx::query!(
        r#"
        SELECT
            COALESCE(SUM(balance::float8), 0.0)::float8 AS "total_balance_circulating!",
            COALESCE(SUM(held::float8), 0.0)::float8 AS "total_held!",
            COALESCE((SELECT COUNT(*)::int8 FROM user_credit_balances WHERE balance > 0), 0) AS "active_funded_users!",
            COALESCE((SELECT SUM(ABS(delta::float8)) FROM credit_transactions WHERE delta < 0), 0.0)::float8 AS "total_burned_lifetime!",
            COALESCE((SELECT SUM(delta::float8) FROM credit_transactions WHERE delta > 0), 0.0)::float8 AS "total_granted_lifetime!",
            COALESCE((SELECT SUM(ABS(delta::float8)) FROM credit_transactions WHERE delta < 0 AND created_at >= NOW() - INTERVAL '24 hours'), 0.0)::float8 AS "burned_24h!",
            COALESCE((SELECT SUM(delta::float8) FROM credit_transactions WHERE delta > 0 AND created_at >= NOW() - INTERVAL '24 hours'), 0.0)::float8 AS "granted_24h!"
        FROM user_credit_balances
        "#
    )
    .fetch_one(db)
    .await?;

    Ok(PlatformCreditsStats {
        total_balance_circulating: row.total_balance_circulating,
        total_held: row.total_held,
        total_burned_lifetime: row.total_burned_lifetime,
        total_granted_lifetime: row.total_granted_lifetime,
        active_funded_users: row.active_funded_users,
        burned_24h: row.burned_24h,
        granted_24h: row.granted_24h,
    })
}
