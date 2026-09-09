use axum::{Json, extract::State};

use super::errors::MetricsError;
use super::types::*;
use crate::gateway::AppState;
use crate::infra::postgres::{billing_repo, metrics_repo};

/// GET /v1/metrics/overview — platform system metrics overview
pub async fn get_overview(
    State(state): State<AppState>,
) -> Result<Json<MetricsOverview>, MetricsError> {
    let users_count = metrics_repo::total_users(&state.db).await?;
    let active_24h = metrics_repo::active_users_24h(&state.db).await?;
    let total_conversations = metrics_repo::total_conversations(&state.db).await?;
    let total_messages = metrics_repo::total_messages(&state.db).await?;
    let user_growth = metrics_repo::user_growth(&state.db).await?;
    let message_activity = metrics_repo::message_activity(&state.db).await?;

    Ok(Json(MetricsOverview {
        total_users: users_count as i32,
        active_users_24h: active_24h as i32,
        total_conversations: total_conversations as i32,
        total_messages: total_messages as i32,
        user_growth,
        message_activity,
    }))
}

/// GET /v1/metrics/credits — platform billing and credit health
pub async fn get_credits(
    State(state): State<AppState>,
) -> Result<Json<billing_repo::PlatformCreditsStats>, MetricsError> {
    let stats = billing_repo::get_platform_credits_stats(&state.db).await?;
    Ok(Json(stats))
}
