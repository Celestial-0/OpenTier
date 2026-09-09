//! Auth-domain SQL (R2: statements live only under infra::postgres).
//! Orchestration lives in `auth::service` / `auth::oauth::service`.

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

// ── Users ────────────────────────────────────────────────────────────────

pub async fn email_exists(db: &PgPool, email: &str) -> Result<bool, sqlx::Error> {
    let row = sqlx::query!("SELECT id FROM users WHERE email = $1", email)
        .fetch_optional(db)
        .await?;
    Ok(row.is_some())
}

pub async fn create_user(
    db: &PgPool,
    email: &str,
    password_hash: &str,
    name: Option<String>,
    username: Option<String>,
    role_label: &str,
) -> Result<Uuid, sqlx::Error> {
    let mut tx = db.begin().await?;

    let row = sqlx::query!(
        r#"
        INSERT INTO users (email, password_hash, name, username, email_verified, role)
        VALUES ($1, $2, $3, $4, FALSE, $5::text::user_role)
        RETURNING id
        "#,
        email,
        password_hash,
        name,
        username,
        role_label
    )
    .fetch_one(&mut *tx)
    .await?;

    let user_id = row.id;

    // Grant 10.0000 free initial credits upon signup (~20 messages)
    sqlx::query!(
        r#"
        INSERT INTO user_credit_balances (user_id, balance, held)
        VALUES ($1, 10.0000, 0.0000)
        ON CONFLICT (user_id) DO NOTHING
        "#,
        user_id
    )
    .execute(&mut *tx)
    .await?;

    let idem_key = format!("signup-bonus-{}", user_id);
    sqlx::query!(
        r#"
        INSERT INTO credit_transactions (
            user_id, delta, balance_after, reason, idempotency_key, metadata
        )
        VALUES ($1, 10.0000, 10.0000, 'signup_bonus', $2, '{"note": "Initial free signup credits grant"}'::jsonb)
        ON CONFLICT (idempotency_key) DO NOTHING
        "#,
        user_id,
        idem_key
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(user_id)
}

pub struct SignInUser {
    pub id: Uuid,
    pub email: String,
    pub password_hash: Option<String>,
    pub email_verified: bool,
    pub role: crate::auth::Role,
}

pub async fn find_for_signin(db: &PgPool, email: &str) -> Result<Option<SignInUser>, sqlx::Error> {
    sqlx::query_as!(
        SignInUser,
        r#"
        SELECT id, email, password_hash, email_verified, role as "role: crate::auth::Role"
        FROM users
        WHERE email = $1 AND deleted_at IS NULL
        "#,
        email
    )
    .fetch_optional(db)
    .await
}

pub struct RecoverUser {
    pub id: Uuid,
    pub email: String,
    pub password_hash: Option<String>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub role: crate::auth::Role,
}

pub async fn find_deleted_by_email(
    db: &PgPool,
    email: &str,
) -> Result<Option<RecoverUser>, sqlx::Error> {
    sqlx::query_as!(
        RecoverUser,
        r#"
        SELECT id, email, password_hash, deleted_at, role as "role: crate::auth::Role"
        FROM users
        WHERE email = $1 AND deleted_at IS NOT NULL
        "#,
        email
    )
    .fetch_optional(db)
    .await
}

/// Restore a soft-deleted account.
pub async fn restore_user(db: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE users
        SET deleted_at = NULL
        WHERE id = $1
        "#,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

pub struct ActiveUserBrief {
    pub id: Uuid,
    pub email: String,
    pub email_verified: bool,
}

/// Active (non-deleted) user lookup by email with verification state.
pub async fn find_active_brief(
    db: &PgPool,
    email: &str,
) -> Result<Option<ActiveUserBrief>, sqlx::Error> {
    sqlx::query_as!(
        ActiveUserBrief,
        r#"
        SELECT id, email, email_verified
        FROM users
        WHERE email = $1 AND deleted_at IS NULL
        "#,
        email
    )
    .fetch_optional(db)
    .await
}

/// Active user id only — forgot-password variant.
pub async fn find_active_id(db: &PgPool, email: &str) -> Result<Option<Uuid>, sqlx::Error> {
    let row = sqlx::query!(
        "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL",
        email
    )
    .fetch_optional(db)
    .await?;
    Ok(row.map(|r| r.id))
}

pub async fn mark_email_verified(db: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE users
        SET email_verified = TRUE
        WHERE id = $1
        "#,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn set_password_hash(
    db: &PgPool,
    password_hash: &str,
    user_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
        "#,
        password_hash,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

// ── Verification tokens ──────────────────────────────────────────────────

pub struct TokenRecord {
    pub user_id: Uuid,
    pub expires_at: DateTime<Utc>,
}

pub async fn insert_verification_token(
    db: &PgPool,
    user_id: Uuid,
    token: &str,
    otp: &str,
    expires_at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO verification_tokens (user_id, token, otp, expires_at)
        VALUES ($1, $2, $3, $4)
        "#,
        user_id,
        token,
        otp,
        expires_at
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn find_verification_by_token(
    db: &PgPool,
    token: &str,
) -> Result<Option<TokenRecord>, sqlx::Error> {
    sqlx::query_as!(
        TokenRecord,
        r#"
        SELECT user_id, expires_at
        FROM verification_tokens
        WHERE token = $1
        "#,
        token
    )
    .fetch_optional(db)
    .await
}

pub async fn find_verification_by_user_otp(
    db: &PgPool,
    user_id: Uuid,
    otp: &str,
) -> Result<Option<TokenRecord>, sqlx::Error> {
    sqlx::query_as!(
        TokenRecord,
        r#"
        SELECT user_id, expires_at
        FROM verification_tokens
        WHERE user_id = $1 AND otp = $2
        "#,
        user_id,
        otp
    )
    .fetch_optional(db)
    .await
}

pub async fn delete_verification_tokens(db: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "DELETE FROM verification_tokens WHERE user_id = $1",
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

// ── Password reset tokens ────────────────────────────────────────────────

pub async fn delete_reset_tokens(db: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "DELETE FROM password_reset_tokens WHERE user_id = $1",
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn insert_reset_token(
    db: &PgPool,
    user_id: Uuid,
    token: &str,
    expires_at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        "#,
        user_id,
        token,
        expires_at
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn find_reset_token(
    db: &PgPool,
    token: &str,
) -> Result<Option<TokenRecord>, sqlx::Error> {
    sqlx::query_as!(
        TokenRecord,
        r#"
        SELECT user_id, expires_at
        FROM password_reset_tokens
        WHERE token = $1
        "#,
        token
    )
    .fetch_optional(db)
    .await
}

pub async fn delete_reset_token(db: &PgPool, token: &str) -> Result<(), sqlx::Error> {
    sqlx::query!("DELETE FROM password_reset_tokens WHERE token = $1", token)
        .execute(db)
        .await?;
    Ok(())
}
