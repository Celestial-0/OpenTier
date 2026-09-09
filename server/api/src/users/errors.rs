use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

#[derive(Debug, thiserror::Error)]
pub enum UserError {
    #[error("{0} not found")]
    NotFound(&'static str),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Username already taken")]
    UsernameAlreadyTaken,

    #[error("Invalid current password")]
    InvalidCurrentPassword,

    #[error("Current password is required")]
    CurrentPasswordRequired,

    #[error("New password is too weak")]
    WeakPassword,

    #[error("New password must be different from current password")]
    PasswordReuse,

    #[error("Session not found")]
    SessionNotFound,

    #[error("{0}")]
    BadRequest(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal server error")]
    Internal,
}

impl IntoResponse for UserError {
    fn into_response(self) -> Response {
        use crate::common::problem::ApiProblem as AP;
        let (status, slug, message) = match &self {
            UserError::NotFound(what) => (
                StatusCode::NOT_FOUND,
                format!("{what}_not_found"),
                format!("{what} not found"),
            ),
            UserError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "unauthorized".to_string(),
                "Unauthorized".to_string(),
            ),
            UserError::UsernameAlreadyTaken => (
                StatusCode::CONFLICT,
                "username_already_taken".to_string(),
                "Username already taken".to_string(),
            ),
            UserError::InvalidCurrentPassword => (
                StatusCode::UNAUTHORIZED,
                "invalid_current_password".to_string(),
                "Invalid current password".to_string(),
            ),
            UserError::CurrentPasswordRequired => (
                StatusCode::BAD_REQUEST,
                "current_password_required".to_string(),
                "Current password is required".to_string(),
            ),
            UserError::WeakPassword => (
                StatusCode::BAD_REQUEST,
                "weak_password".to_string(),
                "New password is too weak".to_string(),
            ),
            UserError::PasswordReuse => (
                StatusCode::BAD_REQUEST,
                "password_reuse".to_string(),
                "New password must be different from current password".to_string(),
            ),
            UserError::SessionNotFound => (
                StatusCode::NOT_FOUND,
                "session_not_found".to_string(),
                "Session not found".to_string(),
            ),
            UserError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                "bad_request".to_string(),
                msg.clone(),
            ),
            UserError::Database(e) => {
                tracing::error!("users database error: {e}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "database_error".to_string(),
                    "A database error occurred".to_string(),
                )
            }
            UserError::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error".to_string(),
                "Internal server error".to_string(),
            ),
        };

        AP::new(status, slug, message).into_response()
    }
}
