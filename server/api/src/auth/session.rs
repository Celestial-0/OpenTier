use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use super::{AuthError, Role, tokens};

/// Create a new session for a user with their role
/// Returns (session_token, expires_at)
pub async fn create_session(
    db: &PgPool,
    user_id: Uuid,
    role: Role,
) -> Result<(String, DateTime<Utc>), AuthError> {
    let session_token = tokens::generate_session_token();
    let expires_at = Utc::now() + Duration::hours(168); // 7 days

    sqlx::query!(
        r#"
        INSERT INTO sessions (user_id, session_token, expires_at, role)
        VALUES ($1, $2, $3, $4)
        "#,
        user_id,
        session_token,
        expires_at,
        role as Role
    )
    .execute(db)
    .await?;

    Ok((session_token, expires_at))
}

/// Get user ID and role from session token
/// Returns (user_id, role) if session is valid
/// This eliminates the need for a separate DB query to fetch the role
pub async fn get_user_from_session(
    db: &PgPool,
    session_token: &str,
) -> Result<(Uuid, Role), AuthError> {
    let result = sqlx::query!(
        r#"
        SELECT user_id, expires_at, role as "role: Role"
        FROM sessions
        WHERE session_token = $1
        "#,
        session_token
    )
    .fetch_optional(db)
    .await?;

    match result {
        Some(session) => {
            // Check if expired
            if session.expires_at < Utc::now() {
                // Delete expired session
                invalidate_session(db, session_token).await?;
                return Err(AuthError::TokenExpired);
            }
            Ok((session.user_id, session.role))
        }
        None => Err(AuthError::SessionNotFound),
    }
}

/// Invalidate a session
pub async fn invalidate_session(db: &PgPool, session_token: &str) -> Result<(), AuthError> {
    sqlx::query!(
        r#"
        DELETE FROM sessions
        WHERE session_token = $1
        "#,
        session_token
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Invalidate all sessions for a user
pub async fn invalidate_all_user_sessions(db: &PgPool, user_id: Uuid) -> Result<(), AuthError> {
    sqlx::query!(
        r#"
        DELETE FROM sessions
        WHERE user_id = $1
        "#,
        user_id
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Invalidate all sessions except the current one
pub async fn invalidate_all_sessions_except(
    db: &PgPool,
    user_id: Uuid,
    current_session_token: &str,
) -> Result<(), AuthError> {
    sqlx::query!(
        r#"
        DELETE FROM sessions
        WHERE user_id = $1 AND session_token != $2
        "#,
        user_id,
        current_session_token
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Cleanup expired sessions (should be run periodically)
pub async fn cleanup_expired_sessions(db: &PgPool) -> Result<u64, sqlx::Error> {
    let result = sqlx::query!(
        r#"
        DELETE FROM sessions
        WHERE expires_at < NOW()
        "#
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected())
}
