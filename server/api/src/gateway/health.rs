use axum::extract::State;
use axum::{Json, Router, routing::get};
use serde::Serialize;
use tracing::error;

use crate::gateway::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    version: String,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api", get(api_health))
        .route("/intelligence", get(intelligence_health))
}

pub async fn api_health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: "v0.1.0".to_string(),
    })
}

pub async fn intelligence_health(State(mut state): State<AppState>) -> Json<HealthResponse> {
    match state.intelligence_client.check_health().await {
        Ok(response) => {
            let inner = response.into_inner();
            Json(HealthResponse {
                status: inner.status,
                version: inner.version.unwrap_or_else(|| "unknown".to_string()),
            })
        }
        Err(e) => {
            error!("Health check failed: {}", e);
            Json(HealthResponse {
                status: "unhealthy".to_string(),
                version: "unknown".to_string(),
            })
        }
    }
}
