//! Session domain operations (SQL delegated to session_repo).
//!
//! This module owns token generation/hashing and role mapping; every
//! persistence statement lives in `infra::postgres::session_repo`.

use std::sync::LazyLock;

use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use super::{AuthError, Role, tokens};
use sqlx::types::ipnetwork::IpNetwork;

/// Session lifetime from configuration (`SESSION_EXPIRY_SECONDS`).
/// Resolved lazily after dotenv has run; replaces the previous hardcoded
/// 7-day expiry that ignored the setting.
static SESSION_EXPIRY_SECS: LazyLock<i64> = LazyLock::new(|| {
    std::env::var("SESSION_EXPIRY_SECONDS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(2_592_000)
});

fn role_label(role: Role) -> String {
    match role {
        Role::User => "user".into(),
        Role::Contributor => "contributor".into(),
        Role::Admin => "admin".into(),
    }
}

fn role_from_label(label: &str) -> Option<Role> {
    match label {
        "user" => Some(Role::User),
        "contributor" => Some(Role::Contributor),
        "admin" => Some(Role::Admin),
        _ => None,
    }
}

/// Create a new session for a user with their role
/// Returns (session_token, expires_at)
pub async fn create_session(
    db: &PgPool,
    user_id: Uuid,
    role: Role,
    ip_address: Option<IpNetwork>,
    user_agent: Option<String>,
) -> Result<(String, DateTime<Utc>), AuthError> {
    let session_token = tokens::generate_session_token();
    let token_hash = tokens::hash_token(&session_token);
    let expires_at = Utc::now() + Duration::seconds((*SESSION_EXPIRY_SECS).max(60));

    crate::infra::postgres::session_repo::insert(
        db,
        crate::infra::postgres::session_repo::NewSession {
            user_id,
            raw_token: &session_token,
            token_hash: &token_hash,
            expires_at,
            role_label: &role_label(role),
            ip_address,
            user_agent,
        },
    )
    .await
    .map_err(AuthError::from)?;

    Ok((session_token, expires_at))
}

/// Get user ID and role from a raw session token
/// Returns (user_id, role) if session is valid
///
/// Resolution is by token hash only, so plaintext lookups are no longer needed.
pub async fn get_user_from_session(
    db: &PgPool,
    session_token: &str,
) -> Result<(Uuid, Role), AuthError> {
    let token_hash = tokens::hash_token(session_token);

    let row = crate::infra::postgres::session_repo::find_auth_by_hash(db, &token_hash)
        .await
        .map_err(AuthError::from)?;

    match row {
        Some(session) => {
            if session.expires_at < Utc::now() {
                invalidate_session_by_raw_token(db, session_token).await?;
                return Err(AuthError::TokenExpired);
            }
            let role = role_from_label(&session.role_label).ok_or(AuthError::Internal)?;
            Ok((session.user_id, role))
        }
        None => Err(AuthError::SessionNotFound),
    }
}

/// Invalidate a session given the raw token presented by the client
pub async fn invalidate_session_by_raw_token(
    db: &PgPool,
    session_token: &str,
) -> Result<(), AuthError> {
    let token_hash = tokens::hash_token(session_token);
    crate::infra::postgres::session_repo::delete_by_hash_or_raw(db, &token_hash, session_token)
        .await
        .map_err(AuthError::from)?;
    Ok(())
}

/// Invalidate all sessions for a user
pub async fn invalidate_all_user_sessions(db: &PgPool, user_id: Uuid) -> Result<(), AuthError> {
    crate::infra::postgres::session_repo::delete_all_for_user(db, user_id)
        .await
        .map_err(AuthError::from)?;
    Ok(())
}

/// Invalidate all sessions except the current one
pub async fn invalidate_all_sessions_except(
    db: &PgPool,
    user_id: Uuid,
    current_session_token: &str,
) -> Result<(), AuthError> {
    let current_hash = tokens::hash_token(current_session_token);
    crate::infra::postgres::session_repo::delete_all_except(db, user_id, &current_hash)
        .await
        .map_err(AuthError::from)?;
    Ok(())
}

/// Cleanup expired sessions (should be run periodically)
pub async fn cleanup_expired_sessions(db: &PgPool) -> Result<u64, sqlx::Error> {
    crate::infra::postgres::session_repo::delete_expired(db).await
}
