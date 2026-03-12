use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SubmissionError {
    #[error("Content too large (max 10MB)")]
    ContentTooLarge,

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Submission not found")]
    NotFound,

    #[error("Submission already reviewed")]
    AlreadyReviewed,

    #[error("Invalid review action: {0}")]
    InvalidAction(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("gRPC service error: {0}")]
    GrpcError(String),

    #[error("Internal server error")]
    #[allow(dead_code)]
    Internal,
}

impl IntoResponse for SubmissionError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            SubmissionError::ContentTooLarge => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "Content too large (max 10MB)".to_string(),
            ),
            SubmissionError::Validation(ref msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            SubmissionError::NotFound => {
                (StatusCode::NOT_FOUND, "Submission not found".to_string())
            }
            SubmissionError::AlreadyReviewed => (
                StatusCode::CONFLICT,
                "Submission has already been reviewed".to_string(),
            ),
            SubmissionError::InvalidAction(ref a) => (
                StatusCode::BAD_REQUEST,
                format!("Invalid review action: '{}'. Must be 'approve' or 'reject'", a),
            ),
            SubmissionError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            ),
            SubmissionError::GrpcError(ref e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Service error: {}", e),
            ),
            SubmissionError::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            ),
        };

        let body = Json(json!({
            "error": message,
            "message": message,
        }));

        (status, body).into_response()
    }
}
