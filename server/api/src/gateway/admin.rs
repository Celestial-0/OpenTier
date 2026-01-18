use crate::gateway::AppState;
use axum::{
    routing::{get, patch, post},
    Router,
};

use crate::admin::{management, resources};

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
        // Resource routes
        .nest("/resources", resource_routes())
}

fn resource_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            post(resources::add_resource).get(resources::list_resources),
        )
        .route(
            "/{id}",
            get(resources::get_resource_status).delete(resources::delete_resource),
        )
}
