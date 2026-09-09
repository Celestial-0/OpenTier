use crate::gateway::AppState;
use crate::metrics;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/overview", get(metrics::get_overview))
        .route("/credits", get(metrics::get_credits))
}
