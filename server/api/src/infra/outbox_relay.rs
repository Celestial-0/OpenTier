//! Outbox relay: drains `event_outbox` into Redis Streams.
//!
//! Runs as a background task in the gateway; claims in batches so a crash
//! between claim and publish simply redelivers (at-least-once).

use sqlx::PgPool;

use super::postgres::outbox_repo;
use crate::infra::redis::RedisHandle;

const BATCH: i64 = 64;
const TICK: std::time::Duration = std::time::Duration::from_secs(2);

/// Publish one claimed row. Returns Err for relay-level failures.
async fn publish_row(
    redis: &RedisHandle,
    row: &outbox_repo::OutboxRow,
) -> Result<(), crate::infra::redis::RedisError> {
    let envelope = crate::common::events::EventEnvelope::new(
        &row.event_type,
        &row.correlation_id,
        row.payload.clone(),
    );
    let body = envelope.to_json().unwrap_or_else(|_| "{}".to_string());

    redis
        .exec(move |mut c| async move {
            let _id: String = redis::cmd("XADD")
                .arg(&row.stream)
                .arg("*")
                .arg("envelope")
                .arg(&body)
                .query_async(&mut c)
                .await?;
            Ok(())
        })
        .await
}

/// Drain pending rows once; returns (published, failed).
pub async fn drain_once(db: &PgPool, redis: &RedisHandle) -> (u32, u32) {
    let rows = match outbox_repo::claim_pending(db, BATCH).await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(error = %e, "outbox claim failed");
            return (0, 0);
        }
    };

    let mut published = 0u32;
    let mut failed = 0u32;
    for row in rows {
        match publish_row(redis, &row).await {
            Ok(()) => {
                if let Err(e) = outbox_repo::mark_published(db, row.id).await {
                    tracing::warn!(error = %e, "outbox mark_published failed");
                    failed += 1;
                } else {
                    published += 1;
                }
            }
            Err(e) => {
                failed += 1;
                let msg = e.to_string();
                if let Err(db_err) = outbox_repo::record_failure(db, row.id, &msg).await {
                    tracing::warn!(error = %db_err, "outbox record_failure failed");
                }
            }
        }
    }
    (published, failed)
}

/// Long-lived relay loop.
pub async fn run_relay(db: PgPool, redis: RedisHandle) {
    tracing::info!("outbox relay started");
    loop {
        let (published, failed) = drain_once(&db, &redis).await;
        if published > 0 || failed > 0 {
            tracing::debug!(published, failed, "outbox tick");
        }
        tokio::time::sleep(if failed > 0 { TICK * 4 } else { TICK }).await;
    }
}
