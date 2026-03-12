use crate::gateway::AppState;
use axum::{
    routing::{get, patch, post},
    Router,
};

use crate::admin::management;

pub fn router() -> Router<AppState> {
    Router::new()
        // Management routes
        .route("/users", get(management::list_users))
        .route(
            "/users/{id}",
            get(management::get_user).delete(management::delete_user),
        )
        .route("/users/{id}/role", patch(management::update_user_role))
        .route("/stats", get(management::get_stats))
        // Quota management routes
        .route("/users/{id}/quota", get(management::get_user_quota))
        .route(
            "/users/{id}/quota/limit",
            patch(management::set_user_message_limit),
        )
        .route(
            "/users/{id}/quota/reset",
            post(management::reset_user_usage),
        )
        .route(
            "/users/{id}/disable",
            patch(management::toggle_user_disabled),
        )
}
