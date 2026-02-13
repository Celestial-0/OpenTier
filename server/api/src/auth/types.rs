use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// SIGN IN
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct SignInRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct SignInResponse {
    pub user_id: Uuid,
    pub email: String,
    pub session_token: String,
    pub expires_at: DateTime<Utc>,
}

// ============================================================================
// SIGN UP
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct SignUpRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
    pub username: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SignUpResponse {
    pub user_id: Uuid,
    pub email: String,
    pub message: String,
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub session_token: String,
}

#[derive(Debug, Serialize)]
pub struct RefreshResponse {
    pub session_token: String,
    pub expires_at: DateTime<Utc>,
}

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct VerifyEmailRequest {
    pub token: Option<String>,
    pub email: Option<String>,
    pub otp: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VerifyEmailResponse {
    pub message: String,
    pub email_verified: bool,
}

// ============================================================================
// FORGOT PASSWORD
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct ForgotPasswordResponse {
    pub message: String,
}

// ============================================================================
// RESET PASSWORD
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct ResetPasswordResponse {
    pub message: String,
}

// ============================================================================
// RESEND VERIFICATION
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ResendVerificationRequest {
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct ResendVerificationResponse {
    pub message: String,
}

// ============================================================================
// ACCOUNT RECOVERY
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct RecoverAccountRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct RecoverAccountResponse {
    pub user_id: Uuid,
    pub email: String,
    pub session_token: String,
    pub expires_at: DateTime<Utc>,
    pub message: String,
}
