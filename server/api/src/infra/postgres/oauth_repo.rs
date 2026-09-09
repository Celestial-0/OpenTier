//! OAuth-domain SQL (R2: statements live only under infra::postgres).

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::Role;

// ── Auth states (CSRF/PKCE handshake) ────────────────────────────────────

pub async fn insert_auth_state(
    db: &PgPool,
    state: String,
    provider: String,
    pkce_verifier: String,
    expires_at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO oauth_auth_states (state, provider, pkce_verifier, expires_at)
        VALUES ($1, $2, $3, $4)
        "#,
        state,
        provider,
        pkce_verifier,
        expires_at
    )
    .execute(db)
    .await?;
    Ok(())
}

pub struct AuthStateRow {
    pub provider: String,
    pub pkce_verifier: String,
    pub expires_at: DateTime<Utc>,
}

pub async fn get_auth_state(db: &PgPool, state: &str) -> Result<Option<AuthStateRow>, sqlx::Error> {
    sqlx::query_as!(
        AuthStateRow,
        r#"
        SELECT provider, pkce_verifier, expires_at
        FROM oauth_auth_states
        WHERE state = $1
        "#,
        state
    )
    .fetch_optional(db)
    .await
}

pub async fn delete_auth_state(db: &PgPool, state: &str) -> Result<(), sqlx::Error> {
    sqlx::query!("DELETE FROM oauth_auth_states WHERE state = $1", state)
        .execute(db)
        .await?;
    Ok(())
}

// ── Account linking / OAuth users ────────────────────────────────────────

/// Find the linked user for a provider identity; None when unlink ed.
pub async fn find_account_user(
    db: &PgPool,
    provider: &str,
    provider_account_id: &str,
) -> Result<Option<Uuid>, sqlx::Error> {
    let row = sqlx::query!(
        r#"
        SELECT user_id FROM accounts
        WHERE provider = $1 AND provider_account_id = $2
        "#,
        provider,
        provider_account_id
    )
    .fetch_optional(db)
    .await?;
    Ok(row.map(|r| r.user_id))
}

pub struct UserFlags {
    pub deleted_at: Option<DateTime<Utc>>,
    pub is_disabled: bool,
}

pub async fn get_user_flags(db: &PgPool, user_id: Uuid) -> Result<Option<UserFlags>, sqlx::Error> {
    sqlx::query_as!(
        UserFlags,
        r#"
        SELECT deleted_at, is_disabled
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_optional(db)
    .await
}

/// Recover soft-deleted account and mark verified for trusted OAuth identity.
pub async fn restore_and_verify(db: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE users
        SET deleted_at = NULL, email_verified = TRUE
        WHERE id = $1
        "#,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

pub struct EmailUserFlags {
    pub id: Uuid,
    pub deleted_at: Option<DateTime<Utc>>,
    pub is_disabled: bool,
}

/// Any user (including soft-deleted) by email.
pub async fn find_by_email_any(
    db: &PgPool,
    email: &str,
) -> Result<Option<EmailUserFlags>, sqlx::Error> {
    sqlx::query_as!(
        EmailUserFlags,
        "SELECT id, deleted_at, is_disabled FROM users WHERE email = $1",
        email
    )
    .fetch_optional(db)
    .await
}

pub async fn create_oauth_user(
    db: &PgPool,
    email: String,
    name: Option<String>,
    avatar_url: Option<String>,
    email_verified: bool,
) -> Result<Uuid, sqlx::Error> {
    let mut tx = db.begin().await?;

    let row = sqlx::query!(
        r#"
        INSERT INTO users (email, name, avatar_url, email_verified)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
        email,
        name,
        avatar_url,
        email_verified
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

    let idem_key = format!("signup-{}", user_id);
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

pub async fn link_account(
    db: &PgPool,
    user_id: Uuid,
    provider: &str,
    provider_account_id: &str,
    access_token: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO accounts (user_id, provider, provider_account_id, access_token)
        VALUES ($1, $2, $3, $4)
        "#,
        user_id,
        provider,
        provider_account_id,
        access_token
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn role_of(db: &PgPool, user_id: Uuid) -> Result<Role, sqlx::Error> {
    let row = sqlx::query!(
        r#"
        SELECT role as "role: crate::auth::Role"
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_one(db)
    .await?;
    Ok(row.role)
}

// ── One-time login codes (session handoff) ───────────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn insert_login_code(
    db: &PgPool,
    code: String,
    provider: String,
    session_token: String,
    email: String,
    is_new_user: bool,
    message: String,
    expires_at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO oauth_login_codes (code, provider, session_token, email, is_new_user, message, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        code,
        provider,
        session_token,
        email,
        is_new_user,
        message,
        expires_at
    )
    .execute(db)
    .await?;
    Ok(())
}

pub struct LoginCodeRow {
    pub provider: String,
    pub session_token: String,
    pub email: String,
    pub is_new_user: bool,
    pub message: String,
    pub expires_at: DateTime<Utc>,
}

pub async fn get_login_code(db: &PgPool, code: &str) -> Result<Option<LoginCodeRow>, sqlx::Error> {
    sqlx::query_as!(
        LoginCodeRow,
        r#"
        SELECT provider, session_token, email, is_new_user, message, expires_at
        FROM oauth_login_codes
        WHERE code = $1
        "#,
        code
    )
    .fetch_optional(db)
    .await
}

pub async fn delete_login_code(db: &PgPool, code: &str) -> Result<(), sqlx::Error> {
    sqlx::query!("DELETE FROM oauth_login_codes WHERE code = $1", code)
        .execute(db)
        .await?;
    Ok(())
}
