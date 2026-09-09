use chrono::Utc;
use oauth2::{
    AuthorizationCode, CsrfToken, PkceCodeChallenge, PkceCodeVerifier, Scope, TokenResponse,
};
use sqlx::PgPool;
use sqlx::types::ipnetwork::IpNetwork;

use super::{Provider, build_oauth_client, discord, github, google, microsoft, x};
use crate::auth::{AuthError, session, tokens};
use crate::config::env::OAuthConfig;

/// OAuth callback response
pub struct OAuthCallbackResponse {
    pub oauth_code: String,
    pub provider: String,
}

pub struct OAuthCodeExchangeResult {
    pub provider: String,
    pub session_token: String,
    pub email: String,
    pub is_new_user: bool,
    pub message: String,
}

/// Generate OAuth authorization URL
pub async fn get_authorization_url(
    db: &PgPool,
    provider: Provider,
    config: &OAuthConfig,
) -> Result<String, AuthError> {
    let client = build_oauth_client(provider, config).map_err(|_| AuthError::Internal)?;

    let mut auth_request = client.authorize_url(CsrfToken::new_random);
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    auth_request = auth_request.set_pkce_challenge(pkce_challenge);

    auth_request = match provider {
        Provider::Google => auth_request
            .add_scope(Scope::new("openid".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string())),
        Provider::Microsoft => auth_request
            .add_scope(Scope::new("openid".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string())),
        Provider::GitHub => auth_request
            .add_scope(Scope::new("read:user".to_string()))
            .add_scope(Scope::new("user:email".to_string())),
        Provider::Discord => auth_request
            .add_scope(Scope::new("identify".to_string()))
            .add_scope(Scope::new("email".to_string())),
        Provider::X => auth_request
            .add_scope(Scope::new("users.read".to_string()))
            .add_scope(Scope::new("tweet.read".to_string()))
            .add_scope(Scope::new("users.email".to_string()))
            .add_scope(Scope::new("offline.access".to_string())),
    };

    let (auth_url, csrf_token) = auth_request.url();

    let state = csrf_token.secret().to_string();
    let verifier = pkce_verifier.secret().to_string();
    let expires_at = Utc::now() + chrono::Duration::minutes(10);

    crate::infra::postgres::oauth_repo::insert_auth_state(
        db,
        state,
        provider.as_str().to_string(),
        verifier,
        expires_at,
    )
    .await?;

    Ok(auth_url.to_string())
}

/// Handle OAuth callback and create/link account
pub async fn handle_callback(
    db: &PgPool,
    provider: Provider,
    code: String,
    state: String,
    config: &OAuthConfig,
    ip_address: Option<IpNetwork>,
    user_agent: Option<String>,
) -> Result<OAuthCallbackResponse, AuthError> {
    let client = build_oauth_client(provider, config).map_err(|_| AuthError::Internal)?;

    let state_record = crate::infra::postgres::oauth_repo::get_auth_state(db, &state)
        .await?
        .ok_or(AuthError::InvalidOAuthState)?;

    let state_provider: String = state_record.provider;
    let pkce_verifier: String = state_record.pkce_verifier;
    let state_expires_at: chrono::DateTime<Utc> = state_record.expires_at;

    crate::infra::postgres::oauth_repo::delete_auth_state(db, &state).await?;

    if state_provider != provider.as_str() {
        return Err(AuthError::InvalidOAuthState);
    }

    if state_expires_at < Utc::now() {
        return Err(AuthError::TokenExpired);
    }

    // Exchange code for token
    let token_result = client
        .exchange_code(AuthorizationCode::new(code))
        .set_pkce_verifier(PkceCodeVerifier::new(pkce_verifier))
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
        Provider::Microsoft => {
            let user_info = microsoft::fetch_user_info(access_token)
                .await
                .map_err(|_| AuthError::Internal)?;

            let email = user_info
                .email
                .or(user_info.preferred_username)
                .ok_or(AuthError::ProviderEmailMissing)?;

            (
                user_info.sub,
                email,
                user_info.name,
                user_info.picture,
                true,
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
        Provider::Discord => {
            let user_info = discord::fetch_user_info(access_token)
                .await
                .map_err(|_| AuthError::Internal)?;

            let email = user_info.email.ok_or(AuthError::ProviderEmailMissing)?;
            let avatar_url = discord::avatar_url(&user_info.id, &user_info.avatar);

            (
                user_info.id,
                email,
                user_info.global_name.or(Some(user_info.username)),
                avatar_url,
                user_info.verified.unwrap_or(false),
            )
        }
        Provider::X => {
            let user_info = x::fetch_user_info(access_token)
                .await
                .map_err(|_| AuthError::Internal)?;

            let email = user_info
                .confirmed_email
                .ok_or(AuthError::ProviderEmailMissing)?;

            (
                user_info.id,
                email,
                user_info.name.or(Some(user_info.username)),
                user_info.profile_image_url,
                true,
            )
        }
    };

    // Check if account already exists
    let existing_account = crate::infra::postgres::oauth_repo::find_account_user(
        db,
        provider.as_str(),
        &provider_account_id,
    )
    .await?;

    let (user_id, is_new_user): (uuid::Uuid, bool) = if let Some(account) = existing_account {
        // Existing OAuth account - ensure account is active before sign-in
        let linked_user = crate::infra::postgres::oauth_repo::get_user_flags(db, account)
            .await?
            .ok_or(AuthError::InvalidCredentials)?;

        if linked_user.is_disabled {
            return Err(AuthError::Unauthorized);
        }

        if linked_user.deleted_at.is_some() {
            crate::infra::postgres::oauth_repo::restore_and_verify(db, account).await?;
        }

        (account, false)
    } else {
        // Check if user with this email exists (including soft-deleted users)
        let existing_user =
            crate::infra::postgres::oauth_repo::find_by_email_any(db, &email).await?;

        let is_new = existing_user.is_none();

        let user_id = match existing_user {
            Some(user) => {
                if user.is_disabled {
                    return Err(AuthError::Unauthorized);
                }

                // Recover soft-deleted account and mark verified for trusted OAuth identity.
                if user.deleted_at.is_some() {
                    crate::infra::postgres::oauth_repo::restore_and_verify(db, user.id).await?;
                }

                // Link OAuth to existing user
                user.id
            }
            None => {
                // Create new user
                crate::infra::postgres::oauth_repo::create_oauth_user(
                    db,
                    email.clone(),
                    name.clone(),
                    avatar_url.clone(),
                    email_verified,
                )
                .await?
            }
        };

        // Create OAuth account link
        crate::infra::postgres::oauth_repo::link_account(
            db,
            user_id,
            provider.as_str(),
            &provider_account_id,
            access_token,
        )
        .await?;

        (user_id, is_new)
    };

    // Fetch user role for session creation
    let user_role = crate::infra::postgres::oauth_repo::role_of(db, user_id).await?;

    // Create session with user's role
    let (session_token, expires_at) =
        session::create_session(db, user_id, user_role, ip_address, user_agent).await?;

    let oauth_code = tokens::generate_token();
    let oauth_code_expiry = Utc::now() + chrono::Duration::minutes(2);
    let message = if is_new_user {
        "Account created and signed in successfully via OAuth"
    } else {
        "Signed in successfully via OAuth"
    };

    crate::infra::postgres::oauth_repo::insert_login_code(
        db,
        oauth_code.clone(),
        provider.as_str().to_string(),
        session_token,
        email,
        is_new_user,
        message.to_string(),
        oauth_code_expiry,
    )
    .await?;

    let _ = (user_id, expires_at);

    Ok(OAuthCallbackResponse {
        oauth_code,
        provider: provider.as_str().to_string(),
    })
}

pub async fn exchange_oauth_code(
    db: &PgPool,
    code: String,
) -> Result<OAuthCodeExchangeResult, AuthError> {
    let row = crate::infra::postgres::oauth_repo::get_login_code(db, &code)
        .await?
        .ok_or(AuthError::InvalidToken)?;

    crate::infra::postgres::oauth_repo::delete_login_code(db, &code).await?;

    if row.expires_at < Utc::now() {
        return Err(AuthError::TokenExpired);
    }

    Ok(OAuthCodeExchangeResult {
        provider: row.provider,
        session_token: row.session_token,
        email: row.email,
        is_new_user: row.is_new_user,
        message: row.message,
    })
}
