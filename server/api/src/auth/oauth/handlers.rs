//! OAuth handlers for authentication providers

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Redirect},
};
use serde::{Deserialize, Serialize};
use url::form_urlencoded::Serializer;

use super::{Provider, service};
use crate::auth::{AuthError, OAuthCodeExchangeRequest, OAuthCodeExchangeResponse};
use crate::gateway::AppState;

// ===== Types =====

#[derive(Debug, Serialize)]
pub struct OAuthProvidersResponse {
    /// List of enabled OAuth providers
    pub providers: Vec<String>,
}

// ===== OAuth Authorize =====

/// GET /auth/oauth/{provider}/authorize
/// Redirect to OAuth provider for authorization
pub async fn oauth_authorize(
    State(app_state): State<AppState>,
    Path(provider_str): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let provider = Provider::from_str(&provider_str).ok_or(StatusCode::BAD_REQUEST)?;

    // Check if provider is enabled
    let is_enabled = match provider {
        Provider::Google => app_state.config.oauth.google.enabled,
        Provider::Microsoft => app_state.config.oauth.microsoft.enabled,
        Provider::GitHub => app_state.config.oauth.github.enabled,
        Provider::Discord => app_state.config.oauth.discord.enabled,
        Provider::X => app_state.config.oauth.x.enabled,
    };

    if !is_enabled {
        return Err(StatusCode::BAD_REQUEST);
    }

    let auth_url = service::get_authorization_url(&app_state.db, provider, &app_state.config.oauth)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Redirect::temporary(&auth_url))
}

// ===== OAuth Callback =====

#[derive(Debug, Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    /// OAuth state parameter for CSRF protection (reserved for future use)
    pub state: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

/// GET /auth/oauth/{provider}/callback
/// Handle OAuth provider callback
pub async fn oauth_callback(
    State(app_state): State<AppState>,
    Path(provider_str): Path<String>,
    Query(params): Query<OAuthCallbackQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let provider = Provider::from_str(&provider_str).ok_or(StatusCode::BAD_REQUEST)?;

    // Check if provider is enabled
    let is_enabled = match provider {
        Provider::Google => app_state.config.oauth.google.enabled,
        Provider::Microsoft => app_state.config.oauth.microsoft.enabled,
        Provider::GitHub => app_state.config.oauth.github.enabled,
        Provider::Discord => app_state.config.oauth.discord.enabled,
        Provider::X => app_state.config.oauth.x.enabled,
    };

    if !is_enabled {
        return Err(StatusCode::BAD_REQUEST);
    }

    if let Some(provider_error) = params.error {
        let mut serializer = Serializer::new(String::new());
        serializer.append_pair("provider", provider.as_str());
        serializer.append_pair("error", &provider_error);
        if let Some(desc) = params.error_description {
            serializer.append_pair("error_description", &desc);
        }
        let redirect_base = app_state.config.oauth.frontend_callback_url.trim_end_matches('/');
        let redirect_url = format!("{}?{}", redirect_base, serializer.finish());
        return Ok(Redirect::temporary(&redirect_url));
    }

    let code = params.code.ok_or(StatusCode::BAD_REQUEST)?;
    let state = params.state.ok_or(StatusCode::BAD_REQUEST)?;

    let callback_result = service::handle_callback(
        &app_state.db,
        provider,
        code,
        state,
        &app_state.config.oauth,
    )
    .await;

    let redirect_base = app_state.config.oauth.frontend_callback_url.trim_end_matches('/');

    let redirect_url = match callback_result {
        Ok(result) => {
            let mut serializer = Serializer::new(String::new());
            serializer.append_pair("provider", &result.provider);
            serializer.append_pair("oauth_code", &result.oauth_code);

            format!("{}?{}", redirect_base, serializer.finish())
        }
        Err(err) => {
            tracing::error!(
                "OAuth callback failed for provider {}: {}",
                provider.as_str(),
                err
            );
            let mut serializer = Serializer::new(String::new());
            serializer.append_pair("provider", provider.as_str());
            serializer.append_pair("error", "OAuth authentication failed");
            serializer.append_pair("error_description", &err.to_string());
            format!("{}?{}", redirect_base, serializer.finish())
        }
    };

    Ok(Redirect::temporary(&redirect_url))
}

/// POST /auth/oauth/exchange
/// Exchange one-time OAuth callback code for a session token.
pub async fn oauth_exchange(
    State(app_state): State<AppState>,
    Json(payload): Json<OAuthCodeExchangeRequest>,
) -> Result<Json<OAuthCodeExchangeResponse>, AuthError> {
    let result = service::exchange_oauth_code(&app_state.db, payload.code).await?;

    Ok(Json(OAuthCodeExchangeResponse {
        provider: result.provider,
        session_token: result.session_token,
        email: result.email,
        is_new_user: result.is_new_user,
        message: result.message,
    }))
}

/// GET /auth/oauth/providers
/// Return the list of enabled OAuth providers
pub async fn oauth_get_providers(
    State(app_state): State<AppState>,
) -> Json<OAuthProvidersResponse> {
    let mut providers = Vec::new();

    if app_state.config.oauth.google.enabled {
        providers.push("google".to_string());
    }
    if app_state.config.oauth.microsoft.enabled {
        providers.push("microsoft".to_string());
    }
    if app_state.config.oauth.github.enabled {
        providers.push("github".to_string());
    }
    if app_state.config.oauth.discord.enabled {
        providers.push("discord".to_string());
    }
    if app_state.config.oauth.x.enabled {
        providers.push("x".to_string());
    }

    Json(OAuthProvidersResponse { providers })
}
