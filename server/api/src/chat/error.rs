use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// Chat-specific errors
#[derive(Debug, Error)]
pub enum ChatError {
    #[error("Conversation not found: {0}")]
    ConversationNotFound(String),

    #[error("Invalid message: {0}")]
    InvalidMessage(String),

    #[error("gRPC error: {0}")]
    GrpcError(#[from] tonic::Status),

    #[error("gRPC transport error: {0}")]
    GrpcTransportError(#[from] tonic::transport::Error),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Internal server error: {0}")]
    InternalError(String),

    #[error("Message too long: {0} chars (max: {1})")]
    MessageTooLong(usize, usize),

    #[error("Service unavailable: {0}")]
    #[allow(dead_code)]
    ServiceUnavailable(String),

    #[error("Request timeout: {0}")]
    #[allow(dead_code)]
    RequestTimeout(String),
}

/// Map gRPC status code to appropriate HTTP status and error code
fn map_grpc_status(status: &tonic::Status) -> (StatusCode, &'static str, String) {
    match status.code() {
        tonic::Code::NotFound => (
            StatusCode::NOT_FOUND,
            "not_found",
            status.message().to_string(),
        ),
        tonic::Code::InvalidArgument => (
            StatusCode::BAD_REQUEST,
            "invalid_argument",
            status.message().to_string(),
        ),
        tonic::Code::PermissionDenied => (
            StatusCode::FORBIDDEN,
            "permission_denied",
            status.message().to_string(),
        ),
        tonic::Code::Unauthenticated => (
            StatusCode::UNAUTHORIZED,
            "unauthenticated",
            status.message().to_string(),
        ),
        tonic::Code::ResourceExhausted => (
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limited",
            "Too many requests, please try again later".to_string(),
        ),
        tonic::Code::DeadlineExceeded => (
            StatusCode::GATEWAY_TIMEOUT,
            "timeout",
            "Request timed out".to_string(),
        ),
        tonic::Code::Unavailable => (
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "Intelligence service temporarily unavailable".to_string(),
        ),
        tonic::Code::AlreadyExists => (
            StatusCode::CONFLICT,
            "already_exists",
            status.message().to_string(),
        ),
        _ => (
            StatusCode::BAD_GATEWAY,
            "upstream_error",
            "Intelligence service unavailable".to_string(),
        ),
    }
}

impl IntoResponse for ChatError {
    fn into_response(self) -> Response {
        let (status, error_code, message) = match &self {
            ChatError::ConversationNotFound(_) => (
                StatusCode::NOT_FOUND,
                "conversation_not_found",
                self.to_string(),
            ),

            ChatError::InvalidMessage(_) => {
                (StatusCode::BAD_REQUEST, "invalid_message", self.to_string())
            }
            ChatError::MessageTooLong(_, _) => (
                StatusCode::BAD_REQUEST,
                "message_too_long",
                self.to_string(),
            ),

            ChatError::GrpcError(status) => {
                // Log the full gRPC error for debugging
                tracing::warn!(
                    grpc_code = ?status.code(),
                    grpc_message = %status.message(),
                    "gRPC error from Intelligence service"
                );
                map_grpc_status(status)
            }
            ChatError::GrpcTransportError(e) => {
                tracing::error!("gRPC transport error: {}", e);
                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    "service_unavailable",
                    "Intelligence service unavailable".to_string(),
                )
            }
            ChatError::ServiceUnavailable(_) => (
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                self.to_string(),
            ),
            ChatError::RequestTimeout(_) => (
                StatusCode::GATEWAY_TIMEOUT,
                "timeout",
                self.to_string(),
            ),
            ChatError::DatabaseError(_)
            | ChatError::SerializationError(_)
            | ChatError::InternalError(_) => {
                tracing::error!("Internal error: {}", self);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "An internal error occurred".to_string(),
                )
            }
        };

        let body = Json(json!({
            "error": error_code,
            "message": message,
        }));

        (status, body).into_response()
    }
}

/// Result type for chat operations
pub type ChatResult<T> = Result<T, ChatError>;
