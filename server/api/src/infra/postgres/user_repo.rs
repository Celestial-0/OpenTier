//! User-domain SQL (R2: statements live only under infra::postgres).

use sqlx::PgPool;
use uuid::Uuid;

use crate::users::{UserAdminView, UserResponse};

pub async fn get_user_by_id(db: &PgPool, user_id: Uuid) -> Result<UserResponse, sqlx::Error> {
    sqlx::query_as!(
        UserResponse,
        r#"
         SELECT id, email, email_verified, (password_hash IS NOT NULL) as "has_password!", name, username, avatar_url,
               role as "role: _", created_at
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        user_id
    )
    .fetch_one(db)
    .await
}

pub async fn username_taken(
    db: &PgPool,
    username: &str,
    exclude_user_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let row = sqlx::query!(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        username,
        exclude_user_id
    )
    .fetch_optional(db)
    .await?;
    Ok(row.is_some())
}

pub async fn update_profile(
    db: &PgPool,
    name: Option<String>,
    username: Option<String>,
    avatar_url: Option<String>,
    user_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE users
        SET name = COALESCE($1, name),
            username = COALESCE($2, username),
            avatar_url = COALESCE($3, avatar_url)
        WHERE id = $4
        "#,
        name,
        username,
        avatar_url,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn role_label_of(db: &PgPool, user_id: Uuid) -> Result<Option<String>, sqlx::Error> {
    let row = sqlx::query!(
        r#"
        SELECT role::text as role
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        user_id
    )
    .fetch_one(db)
    .await?;
    Ok(row.role)
}

pub async fn promote_to_contributor(db: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE users
        SET role = 'contributor'::user_role, updated_at = NOW()
        WHERE id = $1
        "#,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

/// Keep active session authorization consistent after a role change.
pub async fn promote_active_sessions(db: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE sessions
        SET role = 'contributor'::user_role
        WHERE user_id = $1
          AND expires_at > NOW()
          AND role = 'user'::user_role
        "#,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

pub struct PasswordHashRow {
    pub password_hash: Option<String>,
}

pub async fn password_hash(db: &PgPool, user_id: Uuid) -> Result<PasswordHashRow, sqlx::Error> {
    sqlx::query_as!(
        PasswordHashRow,
        "SELECT password_hash FROM users WHERE id = $1",
        user_id
    )
    .fetch_one(db)
    .await
}

pub async fn set_password(db: &PgPool, hash: String, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        hash,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn soft_delete(
    executor: impl sqlx::PgExecutor<'_>,
    user_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query!("UPDATE users SET deleted_at = NOW() WHERE id = $1", user_id)
        .execute(executor)
        .await?;
    Ok(())
}

#[derive(Debug, sqlx::FromRow)]
pub struct SessionRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub session_token_hash: Option<String>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn list_sessions(db: &PgPool, user_id: Uuid) -> Result<Vec<SessionRow>, sqlx::Error> {
    sqlx::query_as::<_, SessionRow>(
        r#"
        SELECT id, user_id, session_token_hash, expires_at,
               ip_address::TEXT as ip_address, user_agent, created_at
        FROM sessions
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(db)
    .await
}

/// Delete a session owned by the user; returns rows affected.
pub async fn revoke_session(
    db: &PgPool,
    session_id: Uuid,
    user_id: Uuid,
) -> Result<u64, sqlx::Error> {
    let result = sqlx::query("DELETE FROM sessions WHERE id = $1 AND user_id = $2")
        .bind(session_id)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(result.rows_affected())
}

/// Backfill session user agent and IP if missing
pub async fn backfill_session_metadata(
    db: &PgPool,
    user_id: Uuid,
    user_agent: Option<&str>,
    ip_address: Option<&str>,
) -> Result<(), sqlx::Error> {
    let _ = sqlx::query(
        r#"
        UPDATE sessions
        SET user_agent = COALESCE(user_agent, $1),
            ip_address = COALESCE(ip_address, $2::inet)
        WHERE user_id = $3
          AND (user_agent IS NULL OR ip_address IS NULL)
          AND expires_at > NOW()
        "#,
    )
    .bind(user_agent)
    .bind(ip_address)
    .bind(user_id)
    .execute(db)
    .await;
    Ok(())
}

// ============================================================================
// ADMINISTRATIVE USER MANAGEMENT SQL
// ============================================================================

pub async fn list_users(
    db: &PgPool,
    limit: i64,
    offset: i64,
    search_term: Option<String>,
) -> Result<Vec<UserAdminView>, sqlx::Error> {
    sqlx::query_as!(
        UserAdminView,
        r#"
        SELECT
            u.id, u.email as "email!", u.name as "full_name?", u.role::text as "role!",
            u.email_verified as "is_verified!", u.created_at as "created_at!", u.updated_at as "updated_at!",
            u.is_disabled as "is_disabled!", u.message_limit as "message_limit!", u.messages_used as "messages_used!",
            COALESCE(b.balance::float8, 0.0) as "credit_balance!",
            COALESCE(b.held::float8, 0.0) as "credit_held!"
        FROM users u
        LEFT JOIN user_credit_balances b ON b.user_id = u.id
        WHERE ($3::text IS NULL OR u.email ILIKE '%' || $3 || '%')
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset,
        search_term
    )
    .fetch_all(db)
    .await
}

pub async fn count_users(db: &PgPool, search_term: Option<String>) -> Result<i64, sqlx::Error> {
    let n = sqlx::query_scalar!(
        "SELECT count(*) FROM users WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%')",
        search_term
    )
    .fetch_one(db)
    .await?;
    Ok(n.unwrap_or(0))
}

pub async fn get_user_view(
    db: &PgPool,
    user_id: Uuid,
) -> Result<Option<UserAdminView>, sqlx::Error> {
    sqlx::query_as!(
        UserAdminView,
        r#"
        SELECT
            u.id, u.email as "email!", u.name as "full_name?", u.role::text as "role!",
            u.email_verified as "is_verified!", u.created_at as "created_at!", u.updated_at as "updated_at!",
            u.is_disabled as "is_disabled!", u.message_limit as "message_limit!", u.messages_used as "messages_used!",
            COALESCE(b.balance::float8, 0.0) as "credit_balance!",
            COALESCE(b.held::float8, 0.0) as "credit_held!"
        FROM users u
        LEFT JOIN user_credit_balances b ON b.user_id = u.id
        WHERE u.id = $1
        "#,
        user_id
    )
    .fetch_optional(db)
    .await
}

pub async fn update_role(
    db: &PgPool,
    user_id: Uuid,
    role_label: String,
) -> Result<Option<UserAdminView>, sqlx::Error> {
    sqlx::query_as!(
        UserAdminView,
        r#"
        WITH updated AS (
            UPDATE users
            SET role = $2::text::user_role, updated_at = NOW()
            WHERE id = $1
            RETURNING id, email, name, role, email_verified, created_at, updated_at, is_disabled, message_limit, messages_used
        )
        SELECT
            u.id, u.email as "email!", u.name as "full_name?", u.role::text as "role!",
            u.email_verified as "is_verified!", u.created_at as "created_at!", u.updated_at as "updated_at!",
            u.is_disabled as "is_disabled!", u.message_limit as "message_limit!", u.messages_used as "messages_used!",
            COALESCE(b.balance::float8, 0.0) as "credit_balance!",
            COALESCE(b.held::float8, 0.0) as "credit_held!"
        FROM updated u
        LEFT JOIN user_credit_balances b ON b.user_id = u.id
        "#,
        user_id,
        role_label
    )
    .fetch_optional(db)
    .await
}

pub async fn hard_delete_user(db: &PgPool, user_id: Uuid) -> Result<u64, sqlx::Error> {
    let result = sqlx::query!("DELETE FROM users WHERE id = $1", user_id)
        .execute(db)
        .await?;
    Ok(result.rows_affected())
}

#[allow(dead_code)]
pub struct UserDisabledRow {
    pub id: Uuid,
    pub email: String,
    pub is_disabled: bool,
    pub message_limit: i32,
    pub messages_used: i32,
}

pub async fn set_disabled(
    db: &PgPool,
    user_id: Uuid,
    disabled: bool,
) -> Result<Option<UserDisabledRow>, sqlx::Error> {
    sqlx::query_as!(
        UserDisabledRow,
        r#"
        UPDATE users
        SET is_disabled = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email as "email!", is_disabled, message_limit, messages_used
        "#,
        user_id,
        disabled
    )
    .fetch_optional(db)
    .await
}

/// Check whether a user is disabled or soft-deleted.
/// Returns None if the user does not exist or has been soft-deleted.
pub async fn is_user_disabled(
    db: &PgPool,
    user_id: Uuid,
) -> Result<Option<bool>, sqlx::Error> {
    use sqlx::Row;
    let row = sqlx::query(
        "SELECT is_disabled FROM users WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(user_id)
    .fetch_optional(db)
    .await?;
    Ok(row.map(|r| r.get("is_disabled")))
}

/// Atomically records and increments anonymous IP message count in PostgreSQL (fallback when Redis is unavailable).
/// Returns the updated message count for the IP.
pub async fn record_and_get_ip_usage(
    db: &PgPool,
    peer_ip: &str,
) -> Result<i32, sqlx::Error> {
    use sqlx::Row;
    let row = sqlx::query(
        r#"
        INSERT INTO ip_usage (ip_address, messages_used, first_seen, last_seen)
        VALUES ($1, 1, NOW(), NOW())
        ON CONFLICT (ip_address) DO UPDATE
            SET messages_used = ip_usage.messages_used + 1,
                last_seen = NOW()
        RETURNING messages_used
        "#,
    )
    .bind(peer_ip)
    .fetch_one(db)
    .await?;
    Ok(row.get("messages_used"))
}

