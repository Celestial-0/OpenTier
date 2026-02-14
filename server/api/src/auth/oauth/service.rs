use chrono::Utc;
use oauth2::{AuthorizationCode, CsrfToken, PkceCodeChallenge, Scope, TokenResponse};
use sqlx::PgPool;
use uuid::Uuid;

use super::{Provider, build_oauth_client, github, google};
use crate::auth::{AuthError, session};
use crate::config::env::OAuthConfig;

/// OAuth callback response
pub struct OAuthCallbackResponse {
    pub user_id: Uuid,
    pub email: String,
    pub session_token: String,
    pub expires_at: chrono::DateTime<Utc>,
    pub is_new_user: bool,
}

/// Generate OAuth authorization URL
pub fn get_authorization_url(
    provider: Provider,
    config: &OAuthConfig,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = build_oauth_client(provider, config)?;

    let (pkce_challenge, _pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let (auth_url, _csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("email".to_string()))
        .add_scope(Scope::new("profile".to_string()))
        .set_pkce_challenge(pkce_challenge)
        .url();

    Ok(auth_url.to_string())
}

/// Handle OAuth callback and create/link account
pub async fn handle_callback(
    db: &PgPool,
    provider: Provider,
    code: String,
    config: &OAuthConfig,
) -> Result<OAuthCallbackResponse, AuthError> {
    let client = build_oauth_client(provider, config).map_err(|_| AuthError::Internal)?;

    // Exchange code for token
    let token_result = client
        .exchange_code(AuthorizationCode::new(code))
        .request_async(oauth2::reqwest::async_http_client)
        .await
        .map_err(|_| AuthError::Internal)?;

    let access_token = token_result.access_token().secret();

    // Fetch user info based on provider
    let (provider_account_id, email, name, avatar_url, email_verified) = match provider {
        Provider::Google => {
            let user_info = google::fetch_user_info(access_token)
                .await
                .map_err(|_| AuthError::Internal)?;
            (
                user_info.sub,
                user_info.email,
                user_info.name,
                user_info.picture,
                user_info.email_verified,
            )
        }
        Provider::GitHub => {
            let user_info = github::fetch_user_info(access_token)
                .await
                .map_err(|_| AuthError::Internal)?;

            // Get primary verified email
            let emails = github::fetch_user_emails(access_token)
                .await
                .map_err(|_| AuthError::Internal)?;

            let primary_email = emails
                .iter()
                .find(|e| e.primary && e.verified)
                .or_else(|| emails.first())
                .ok_or(AuthError::Internal)?;

            (
                user_info.id.to_string(),
                primary_email.email.clone(),
                user_info.name.or(Some(user_info.login)),
                user_info.avatar_url,
                primary_email.verified,
            )
        }
    };

    // Check if account already exists
    let existing_account = sqlx::query!(
        r#"
        SELECT user_id FROM accounts
        WHERE provider = $1 AND provider_account_id = $2
        "#,
        provider.as_str(),
        provider_account_id
    )
    .fetch_optional(db)
    .await?;

    let (user_id, is_new_user) = if let Some(account) = existing_account {
        // Existing OAuth account - just sign in
        (account.user_id, false)
    } else {
        // Check if user with this email exists
        let existing_user = sqlx::query!(
            "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL",
            email
        )
        .fetch_optional(db)
        .await?;

        let is_new = existing_user.is_none();

        let user_id = if let Some(ref user) = existing_user {
            // Link OAuth to existing user
            user.id
        } else {
            // Create new user
            let new_user = sqlx::query!(
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
            .fetch_one(db)
            .await?;

            new_user.id
        };

        // Create OAuth account link
        sqlx::query!(
            r#"
            INSERT INTO accounts (user_id, provider, provider_account_id, access_token)
            VALUES ($1, $2, $3, $4)
            "#,
            user_id,
            provider.as_str(),
            provider_account_id,
            access_token
        )
        .execute(db)
        .await?;

        (user_id, is_new)
    };

    // Fetch user role for session creation
    let user_role = sqlx::query!(
        r#"
        SELECT role as "role: crate::auth::Role"
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_one(db)
    .await?
    .role;

    // Create session with user's role
    let (session_token, expires_at) =
        session::create_session(db, user_id, user_role, None, None).await?;

    Ok(OAuthCallbackResponse {
        user_id,
        email,
        session_token,
        expires_at,
        is_new_user,
    })
}
