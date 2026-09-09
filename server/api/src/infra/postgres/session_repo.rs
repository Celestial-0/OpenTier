//! Session persistence (R2: statements live only under infra::postgres).
//! Domain wrapper: `auth::session` hashes tokens and maps roles; this module
//! owns every statement.

use chrono::DateTime;
use sqlx::PgPool;

pub struct SessionAuthRow {
    pub user_id: uuid::Uuid,
    pub expires_at: DateTime<chrono::Utc>,
    pub role_label: String,
}

pub struct NewSession<'a> {
    pub user_id: uuid::Uuid,
    pub raw_token: &'a str,
    pub token_hash: &'a str,
    pub expires_at: DateTime<chrono::Utc>,
    pub role_label: &'a str,
    pub ip_address: Option<sqlx::types::ipnetwork::IpNetwork>,
    pub user_agent: Option<String>,
}

pub async fn insert(db: &PgPool, session: NewSession<'_>) -> Result<(), sqlx::Error> {
    // Dual-write of `session_token` continues until the contract migration
    // drops it.
    sqlx::query!(
        r#"
        INSERT INTO sessions (user_id, session_token, session_token_hash, expires_at, role, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, CAST($5::text AS user_role), $6, $7)
        "#,
        session.user_id,
        session.raw_token,
        session.token_hash,
        session.expires_at,
        session.role_label,
        session.ip_address,
        session.user_agent
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn find_auth_by_hash(
    db: &PgPool,
    token_hash: &str,
) -> Result<Option<SessionAuthRow>, sqlx::Error> {
    sqlx::query_as!(
        SessionAuthRow,
        r#"
        SELECT user_id, expires_at,
               role::text AS "role_label!"
        FROM sessions
        WHERE session_token_hash = $1
        "#,
        token_hash
    )
    .fetch_optional(db)
    .await
}

/// Expand-phase delete: matches either representation (contract drop later).
pub async fn delete_by_hash_or_raw(
    db: &PgPool,
    token_hash: &str,
    raw_token: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        DELETE FROM sessions
        WHERE session_token_hash = $1
           OR session_token = $2
        "#,
        token_hash,
        raw_token
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn delete_all_for_user(db: &PgPool, user_id: uuid::Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!("DELETE FROM sessions WHERE user_id = $1", user_id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn delete_all_except(
    db: &PgPool,
    user_id: uuid::Uuid,
    keep_hash: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "DELETE FROM sessions WHERE user_id = $1 AND session_token_hash != $2",
        user_id,
        keep_hash
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn delete_expired(db: &PgPool) -> Result<u64, sqlx::Error> {
    let result = sqlx::query!("DELETE FROM sessions WHERE expires_at < NOW()")
        .execute(db)
        .await?;
    Ok(result.rows_affected())
}
