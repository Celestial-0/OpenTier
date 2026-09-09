use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CatalogError {
    #[error("{0} not found")]
    NotFound(&'static str),
    #[error("{0}")]
    BadRequest(String),
    #[error("database error")]
    Database(#[from] sqlx::Error),
}

impl IntoResponse for CatalogError {
    fn into_response(self) -> Response {
        use crate::common::problem::ApiProblem;
        let problem = match &self {
            CatalogError::NotFound(what) => ApiProblem::new(
                StatusCode::NOT_FOUND,
                format!("{what}_not_found"),
                self.to_string(),
            ),
            CatalogError::BadRequest(_) => {
                ApiProblem::new(StatusCode::BAD_REQUEST, "bad_request", self.to_string())
            }
            CatalogError::Database(e) => {
                tracing::error!("catalog db error: {e}");
                ApiProblem::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "An internal error occurred",
                )
            }
        };
        problem.into_response()
    }
}
