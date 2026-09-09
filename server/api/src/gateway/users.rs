use axum::{
    Router, middleware,
    routing::{delete, get, patch, post, put},
};

use crate::gateway::AppState;
use crate::users::*;

pub fn routes(state: AppState) -> Router<AppState> {
    let admin_mw = middleware::from_fn_with_state(state.clone(), crate::middleware::require_admin);

    let me_routes = Router::new()
        .route("/", get(me).patch(update_profile).delete(delete_account))
        .route("/password", put(change_password).post(change_password))
        .route("/sessions", get(list_sessions))
        .route("/sessions/{session_id}", delete(revoke_session))
        .route("/credits", get(get_credits))
        .route("/credits/transactions", get(get_credit_transactions))
        .route("/credits/usage", get(get_usage_summary))
        .route("/credits/usage-summary", get(get_usage_summary));

    let admin_user_routes = Router::new()
        .route("/", get(list_users))
        .route(
            "/{id}",
            get(get_user).patch(update_user).delete(delete_user),
        )
        .route("/{id}/role", patch(update_user_role).put(update_user_role))
        .route("/{id}/disable", patch(toggle_user_disabled))
        .route("/{id}/credits", get(get_user_credits))
        .route("/{id}/credits/adjustments", post(adjust_user_credits))
        .route("/{id}/credits/adjust", post(adjust_user_credits))
        .layer(admin_mw);

    Router::new()
        .nest("/me", me_routes)
        .merge(admin_user_routes)
}
