use axum::{
    Router, middleware,
    routing::{get, patch, post},
};

use crate::catalog;
use crate::gateway::AppState;

pub fn routes(state: AppState) -> Router<AppState> {
    let auth_mw = middleware::from_fn_with_state(state.clone(), crate::middleware::auth_middleware);
    let admin_mw = middleware::from_fn_with_state(state.clone(), crate::middleware::require_admin);

    let admin_routes = Router::new()
        .route("/", post(catalog::create_provider))
        .route(
            "/{id}",
            patch(catalog::update_provider).delete(catalog::delete_provider),
        )
        .layer(admin_mw)
        .layer(auth_mw);

    Router::new()
        .route("/", get(catalog::list_providers))
        .merge(admin_routes)
}
