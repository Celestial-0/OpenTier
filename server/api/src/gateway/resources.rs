use crate::gateway::AppState;
use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post},
    Router,
};

use crate::resource::handlers;
use crate::resource::management as resource_management;

const MAX_SUBMISSION_PAYLOAD_BYTES: usize = 10 * 1024 * 1024;

/// Resource submission and queue routes
///
/// Canonical routes:
/// - POST /submissions             — Contributor or Admin: submit a resource for review
/// - GET  /submissions/mine        — Contributor or Admin: list own submissions
/// - GET  /submissions             — Admin only: list queue submissions (filter by status)
/// - POST /submissions/:id/review  — Admin only: approve or reject a submission
pub fn submit_routes() -> Router<AppState> {
    Router::new()
        .route("/submissions", post(handlers::submit_resource))
        .route("/submissions/mine", get(handlers::list_my_submissions))
        .layer(DefaultBodyLimit::max(MAX_SUBMISSION_PAYLOAD_BYTES))
}

pub fn queue_routes() -> Router<AppState> {
    Router::new()
        .route("/submissions", get(handlers::list_queue))
        .route("/submissions/{id}/review", post(handlers::review_submission))
}

/// Admin-only resource management routes.
///
/// Canonical routes:
/// - POST /               — Add resource for ingestion
/// - GET  /               — List indexed resources
/// - GET  /:id            — Get resource ingestion/status details
/// - DELETE /:id          — Delete indexed resource
pub fn admin_management_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            post(resource_management::add_resource).get(resource_management::list_resources),
        )
        .route(
            "/{id}",
            get(resource_management::get_resource_status).delete(resource_management::delete_resource),
        )
}
