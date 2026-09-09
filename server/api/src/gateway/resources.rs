use crate::auth::Role;
use crate::gateway::AppState;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Extension, Query, State},
    middleware,
    routing::{get, post},
};
use uuid::Uuid;

use crate::resources::errors::SubmissionError;
use crate::resources::handlers;
use crate::resources::management as resource_management;
use crate::resources::types::*;

const MAX_SUBMISSION_PAYLOAD_BYTES: usize = 10 * 1024 * 1024;

/// Unified GET /resources/submissions handler:
/// Supports ?filter=me for own submissions (contributors & admins),
/// or full moderation queue by status (e.g. ?status=pending, admins only).
pub async fn list_submissions(
    state: State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(role): Extension<Role>,
    query: Query<QueueListQuery>,
) -> Result<Json<QueueListResponse>, SubmissionError> {
    if query.filter.as_deref() == Some("me") {
        handlers::list_my_submissions(state, Extension(user_id), query).await
    } else {
        if role != Role::Admin {
            return Err(SubmissionError::Forbidden);
        }
        handlers::list_queue(state, query).await
    }
}

pub fn routes(state: AppState) -> Router<AppState> {
    let auth_mw = middleware::from_fn_with_state(state.clone(), crate::middleware::auth_middleware);
    let admin_mw = middleware::from_fn_with_state(state.clone(), crate::middleware::require_admin);
    let contrib_mw = middleware::from_fn_with_state(
        state.clone(),
        crate::middleware::require_contributor_or_admin,
    );

    // Contributor or Admin submission management
    let submissions_router = Router::new()
        .route(
            "/submissions",
            post(handlers::submit_resource)
                .get(list_submissions)
                .layer(DefaultBodyLimit::max(MAX_SUBMISSION_PAYLOAD_BYTES)),
        )
        // Backward-compat alias for listing own submissions
        .route("/submissions/mine", get(handlers::list_my_submissions))
        .layer(contrib_mw);

    // Admin moderation review & resource management
    let admin_review_router = Router::new()
        .route(
            "/submissions/{id}/reviews",
            post(handlers::review_submission),
        )
        .route(
            "/submissions/{id}/review",
            post(handlers::review_submission),
        )
        .layer(admin_mw.clone());

    let admin_resources_router = Router::new()
        .route(
            "/",
            post(resource_management::add_resource).get(resource_management::list_resources),
        )
        .route(
            "/{id}",
            get(resource_management::get_resource_status)
                .delete(resource_management::delete_resource),
        )
        .layer(admin_mw);

    Router::new()
        .merge(submissions_router)
        .merge(admin_review_router)
        .merge(admin_resources_router)
        .layer(auth_mw)
}
