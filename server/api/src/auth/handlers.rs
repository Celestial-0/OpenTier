use axum::{
    Json,
    extract::{Query, State},
    http::{HeaderMap, header},
};

use crate::gateway::AppState;

use super::{
    AuthError, ForgotPasswordRequest, ForgotPasswordResponse, RecoverAccountRequest,
    RecoverAccountResponse, RefreshRequest, RefreshResponse, ResendVerificationRequest,
    ResendVerificationResponse, ResetPasswordRequest, ResetPasswordResponse, SignInRequest,
    SignInResponse, SignUpRequest, SignUpResponse, VerifyEmailRequest, VerifyEmailResponse,
    service,
};

// ===== Sign Up =====

/// POST /auth/signup
/// Register a new user account
pub async fn signup(
    State(app_state): State<AppState>,
    Json(payload): Json<SignUpRequest>,
) -> Result<Json<SignUpResponse>, AuthError> {
    crate::common::validation::validate_email(&payload.email)
        .map_err(|e| AuthError::Validation(e))?;
    crate::common::validation::validate_password(&payload.password)
        .map_err(|e| AuthError::Validation(e))?;

    let response = service::signup(&app_state.db, payload, &app_state.config.email).await?;
    Ok(Json(response))
}

// ===== Sign In =====

/// POST /auth/signin
/// Authenticate user and create session
pub async fn signin(
    State(app_state): State<AppState>,
    Json(payload): Json<SignInRequest>,
) -> Result<Json<SignInResponse>, AuthError> {
    crate::common::validation::validate_email(&payload.email)
        .map_err(|e| AuthError::Validation(e))?;

    let response = service::signin(&app_state.db, payload).await?;
    Ok(Json(response))
}

// ===== Sign Out =====

/// POST /auth/signout
/// Invalidate current session
pub async fn signout(
    State(app_state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, AuthError> {
    // Extract Bearer token from Authorization header
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(AuthError::Unauthorized)?;

    let session_token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AuthError::Unauthorized)?;

    service::signout(&app_state.db, session_token).await?;
    Ok(Json(serde_json::json!({
        "message": "Signed out successfully"
    })))
}

// ===== Refresh Token =====

/// POST /auth/refresh
/// Refresh session token
pub async fn refresh(
    State(app_state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<RefreshResponse>, AuthError> {
    let response = service::refresh_session(&app_state.db, payload).await?;
    Ok(Json(response))
}

// ===== Email Verification =====

/// GET /auth/verify-email
/// Verify user email address via token link
pub async fn verify_get(
    State(app_state): State<AppState>,
    Query(params): Query<VerifyEmailRequest>,
) -> Result<Json<VerifyEmailResponse>, AuthError> {
    let response = service::verify_email(&app_state.db, params).await?;
    Ok(Json(response))
}

/// POST /auth/verify-email
/// Verify user email address via OTP or token
pub async fn verify_post(
    State(app_state): State<AppState>,
    Json(payload): Json<VerifyEmailRequest>,
) -> Result<Json<VerifyEmailResponse>, AuthError> {
    let response = service::verify_email(&app_state.db, payload).await?;
    Ok(Json(response))
}

// ===== Forgot Password =====

/// POST /auth/forgot-password
/// Send password reset email
pub async fn forgot_password(
    State(app_state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> Result<Json<ForgotPasswordResponse>, AuthError> {
    let response =
        service::forgot_password(&app_state.db, payload, &app_state.config.email).await?;
    Ok(Json(response))
}

// ===== Reset Password =====

/// POST /auth/reset-password
/// Reset password with token
pub async fn reset_password(
    State(app_state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<ResetPasswordResponse>, AuthError> {
    let response = service::reset_password(&app_state.db, payload).await?;
    Ok(Json(response))
}

// ===== Resend Verification Email =====

/// POST /auth/resend-verification
/// Resend verification email to user
pub async fn resend_verification(
    State(app_state): State<AppState>,
    Json(payload): Json<ResendVerificationRequest>,
) -> Result<Json<ResendVerificationResponse>, AuthError> {
    let response =
        service::resend_verification_email(&app_state.db, payload, &app_state.config.email).await?;
    Ok(Json(response))
}

// ===== Account Recovery =====

/// POST /auth/recover-account
/// Recover a soft-deleted account
pub async fn recover_account(
    State(app_state): State<AppState>,
    Json(payload): Json<RecoverAccountRequest>,
) -> Result<Json<RecoverAccountResponse>, AuthError> {
    let response = service::recover_account(&app_state.db, payload).await?;
    Ok(Json(response))
}
