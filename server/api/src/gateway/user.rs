use axum::{
    Router,
    routing::{delete, get, patch, post},
};

use crate::gateway::AppState;
use crate::user::{
    change_password, delete_account, list_sessions, me, revoke_session,
    update_profile,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/me", get(me))
        .route("/update-profile", patch(update_profile))
        .route("/change-password", post(change_password))
        .route("/delete-account", delete(delete_account))
        .route("/list-sessions", get(list_sessions))
        .route("/revoke-session/{session_id}", delete(revoke_session))
}
