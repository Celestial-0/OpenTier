use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Email already exists")]
    EmailAlreadyExists,

    #[allow(dead_code)] // Reserved for OAuth
    #[error("User already exists")]
    UserAlreadyExists,

    #[error("Invalid token")]
    InvalidToken,

    #[error("Token expired")]
    TokenExpired,

    #[error("Password too weak")]
    WeakPassword,

    #[error("Email not verified")]
    EmailNotVerified,

    #[error("Session not found")]
    SessionNotFound,

    #[error("Account recovery period has expired")]
    AccountRecoveryExpired,

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Password hashing error")]
    HashError,

    #[error("Validation error: {0}")]
    Validation(String),

    #[allow(dead_code)] // Reserved for future use
    #[error("Internal auth error")]
    Internal,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AuthError::InvalidCredentials => (StatusCode::UNAUTHORIZED, "Invalid credentials"),
            AuthError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized"),
            AuthError::EmailAlreadyExists => (StatusCode::CONFLICT, "Email already exists"),
            AuthError::UserAlreadyExists => (StatusCode::CONFLICT, "User already exists"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token"),
            AuthError::TokenExpired => (StatusCode::UNAUTHORIZED, "Token expired"),
            AuthError::WeakPassword => (StatusCode::BAD_REQUEST, "Password too weak"),
            AuthError::EmailNotVerified => (StatusCode::FORBIDDEN, "Email not verified"),
            AuthError::SessionNotFound => (StatusCode::UNAUTHORIZED, "Session not found"),
            AuthError::AccountRecoveryExpired => {
                (StatusCode::GONE, "Account recovery period has expired")
            }
            AuthError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
            AuthError::HashError => (StatusCode::INTERNAL_SERVER_ERROR, "Hash error"),
            AuthError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "Internal error"),
            AuthError::Validation(ref msg) => (StatusCode::BAD_REQUEST, msg.as_str()),
        };

        let body = Json(json!({
            "error": message,
            "message": message,
        }));

        (status, body).into_response()
    }
}
