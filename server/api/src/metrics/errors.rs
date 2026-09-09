use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MetricsError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}

impl IntoResponse for MetricsError {
    fn into_response(self) -> Response {
        use crate::common::problem::ApiProblem;
        let problem = match &self {
            MetricsError::Database(e) => {
                tracing::error!("metrics database error: {e}");
                ApiProblem::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "An internal error occurred while fetching metrics",
                )
            }
        };
        problem.into_response()
    }
}
