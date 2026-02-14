use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum UserError {
    #[allow(dead_code)] // Reserved for future use
    #[error("User not found")]
    NotFound,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Username already taken")]
    UsernameAlreadyTaken,

    #[error("Invalid current password")]
    InvalidCurrentPassword,

    #[error("Session not found")]
    SessionNotFound,

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal server error")]
    Internal,
}

impl IntoResponse for UserError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            UserError::NotFound => (StatusCode::NOT_FOUND, "User not found"),
            UserError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized"),
            UserError::UsernameAlreadyTaken => (StatusCode::CONFLICT, "Username already taken"),
            UserError::InvalidCurrentPassword => {
                (StatusCode::UNAUTHORIZED, "Invalid current password")
            }
            UserError::SessionNotFound => (StatusCode::NOT_FOUND, "Session not found"),
            UserError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
            UserError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
        };

        let body = Json(json!({
            "error": message,
            "message": message,
        }));

        (status, body).into_response()
    }
}
