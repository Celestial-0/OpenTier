use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ResourceError {
    #[error("Unsupported resource type: {0}")]
    UnsupportedResourceType(String),

    #[error("Invalid resource content")]
    InvalidContent,

    #[error("URL validation failed: {0}")]
    InvalidUrl(String),

    #[error("Content too large")]
    ContentTooLarge,

    #[error("Resource not found")]
    #[allow(dead_code)]
    ResourceNotFound,

    #[error("Failed to add resource")]
    #[allow(dead_code)]
    AddResourceFailed,

    #[error("Failed to list resources")]
    #[allow(dead_code)]
    ListResourcesFailed,

    #[error("Failed to get resource status")]
    #[allow(dead_code)]
    GetStatusFailed,

    #[error("Failed to delete resource")]
    DeleteResourceFailed,

    #[error("Invalid filter parameters")]
    InvalidFilters,

    #[error("Unauthorized: insufficient permissions")]
    #[allow(dead_code)]
    Unauthorized,

    #[error("gRPC service error: {0}")]
    GrpcError(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal server error")]
    #[allow(dead_code)]
    Internal,

    #[error("Invalid Content-Type: {0}")]
    InvalidContentType(String),
}

impl IntoResponse for ResourceError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ResourceError::UnsupportedResourceType(ref t) => (
                StatusCode::BAD_REQUEST,
                format!("Unsupported resource type: {}", t),
            ),
            ResourceError::InvalidContent => (
                StatusCode::BAD_REQUEST,
                "Invalid resource content".to_string(),
            ),
            ResourceError::InvalidUrl(ref e) => (
                StatusCode::BAD_REQUEST,
                format!("URL validation failed: {}", e),
            ),
            ResourceError::ContentTooLarge => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "Content too large".to_string(),
            ),
            ResourceError::ResourceNotFound => {
                (StatusCode::NOT_FOUND, "Resource not found".to_string())
            }
            ResourceError::AddResourceFailed => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to add resource".to_string(),
            ),
            ResourceError::ListResourcesFailed => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to list resources".to_string(),
            ),
            ResourceError::GetStatusFailed => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to get resource status".to_string(),
            ),
            ResourceError::DeleteResourceFailed => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to delete resource".to_string(),
            ),
            ResourceError::InvalidFilters => (
                StatusCode::BAD_REQUEST,
                "Invalid filter parameters".to_string(),
            ),
            ResourceError::Unauthorized => (
                StatusCode::FORBIDDEN,
                "Insufficient permissions".to_string(),
            ),
            ResourceError::GrpcError(ref e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Service error: {}", e),
            ),
            ResourceError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            ),
            ResourceError::Validation(ref msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            ResourceError::InvalidContentType(ref msg) => {
                (StatusCode::UNSUPPORTED_MEDIA_TYPE, msg.clone())
            }
            ResourceError::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            ),
        };

        let body = Json(json!({
            "error": message,
        }));

        (status, body).into_response()
    }
}
