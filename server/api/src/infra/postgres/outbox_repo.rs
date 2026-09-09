//! Transactional outbox.
//!
//! Domain transactions call [`insert`] inside their own transaction; the
//! relay task claims pending rows and publishes them to Redis Streams.

use sqlx::PgPool;
use uuid::Uuid;

pub struct OutboxRow {
    pub id: Uuid,
    pub stream: String,
    pub event_type: String,
    pub correlation_id: String,
    pub payload: serde_json::Value,
}

/// Insert an event inside the caller's transaction (atomic with the state
/// change that produced it).
pub async fn insert(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    stream: &str,
    event_type: &str,
    correlation_id: &str,
    payload: serde_json::Value,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO event_outbox (stream, event_type, correlation_id, payload)
        VALUES ($1, $2, $3, $4)
        "#,
        stream,
        event_type,
        correlation_id,
        payload
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Claim up to `batch` unpublished rows (oldest first), bumping attempt
/// counters so a crashed relay cannot lose work.
pub async fn claim_pending(db: &PgPool, batch: i64) -> Result<Vec<OutboxRow>, sqlx::Error> {
    let mut tx = db.begin().await?;
    let ids = sqlx::query!(
        r#"
        UPDATE event_outbox
        SET attempts = attempts + 1
        WHERE id IN (
            SELECT id FROM event_outbox
            WHERE published_at IS NULL AND attempts < 10
            ORDER BY created_at
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id
        "#,
        batch
    )
    .fetch_all(&mut *tx)
    .await?;
    let id_list: Vec<Uuid> = ids.iter().map(|r| r.id).collect();
    tx.commit().await?;

    if id_list.is_empty() {
        return Ok(Vec::new());
    }
    let rows = sqlx::query_as!(
        OutboxRow,
        r#"
        SELECT id, stream, event_type, correlation_id, payload
        FROM event_outbox
        WHERE id = ANY($1)
        ORDER BY created_at
        "#,
        &id_list
    )
    .fetch_all(db)
    .await?;
    Ok(rows)
}

pub async fn mark_published(db: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "UPDATE event_outbox SET published_at = NOW() WHERE id = $1",
        id
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn record_failure(db: &PgPool, id: Uuid, error: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "UPDATE event_outbox SET last_error = $2 WHERE id = $1",
        id,
        error
    )
    .execute(db)
    .await?;
    Ok(())
}
