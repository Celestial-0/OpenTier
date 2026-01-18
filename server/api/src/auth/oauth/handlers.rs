//! OAuth handlers for authentication providers

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Redirect},
};
use serde::{Deserialize, Serialize};

use super::{Provider, service};
use crate::auth::AuthError;
use crate::gateway::AppState;

// ===== OAuth Authorize =====

/// GET /auth/oauth/{provider}/authorize
/// Redirect to OAuth provider for authorization
pub async fn oauth_authorize(
    State(app_state): State<AppState>,
    Path(provider_str): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let provider = Provider::from_str(&provider_str).ok_or(StatusCode::BAD_REQUEST)?;

    let auth_url = service::get_authorization_url(provider, &app_state.config.oauth)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Redirect::temporary(&auth_url))
}

// ===== OAuth Callback =====

#[derive(Debug, Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: String,
    /// OAuth state parameter for CSRF protection (reserved for future use)
    #[allow(dead_code)]
    pub state: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OAuthCallbackResponse {
    pub user_id: String,
    pub email: String,
    pub session_token: String,
    pub expires_at: String,
    pub is_new_user: bool,
    pub message: String,
}

/// GET /auth/oauth/{provider}/callback
/// Handle OAuth provider callback
pub async fn oauth_callback(
    State(app_state): State<AppState>,
    Path(provider_str): Path<String>,
    Query(params): Query<OAuthCallbackQuery>,
) -> Result<Json<OAuthCallbackResponse>, AuthError> {
    let provider = Provider::from_str(&provider_str).ok_or(AuthError::Internal)?;

    let result = service::handle_callback(
        &app_state.db,
        provider,
        params.code,
        &app_state.config.oauth,
    )
    .await?;

    let message = if result.is_new_user {
        "Account created and signed in successfully via OAuth"
    } else {
        "Signed in successfully via OAuth"
    };

    Ok(Json(OAuthCallbackResponse {
        user_id: result.user_id.to_string(),
        email: result.email,
        session_token: result.session_token,
        expires_at: result.expires_at.to_rfc3339(),
        is_new_user: result.is_new_user,
        message: message.to_string(),
    }))
}
