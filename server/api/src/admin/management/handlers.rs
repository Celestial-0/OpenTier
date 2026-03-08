use axum::{
    Json,
    extract::{Path, Query, State},
};
use tracing::error;

use super::types::*;
use crate::gateway::AppState;

/// List users with pagination and search
/// GET /admin/users
pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<UserListQuery>,
) -> Result<Json<UserListResponse>, String> {
    let limit = params.limit.unwrap_or(20) as i64;
    let offset = params.offset.unwrap_or(0) as i64;

    // Implement search
    let search_term = params.search.clone();

    let users = sqlx::query_as!(
        UserAdminView,
        r#"
        SELECT 
            id, email as "email!", name as "full_name?", role::text as "role!", email_verified as "is_verified!", created_at as "created_at!", updated_at as "updated_at!", is_disabled as "is_disabled!", message_limit as "message_limit!", messages_used as "messages_used!"
        FROM users
        WHERE ($3::text IS NULL OR email ILIKE '%' || $3 || '%')
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset,
        search_term
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!("Failed to fetch users: {}", e);
        e.to_string()
    })?;

    // Get total count (filtered)
    let total_count = sqlx::query_scalar!(
        "SELECT count(*) FROM users WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%')",
        search_term
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or(0);

    Ok(Json(UserListResponse {
        users,
        total_count,
        limit: limit as i32,
        offset: offset as i32,
    }))
}

/// Get single user details
/// GET /admin/users/{id}
pub async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<uuid::Uuid>,
) -> Result<Json<UserAdminView>, String> {
    let user = sqlx::query_as!(
        UserAdminView,
        r#"
        SELECT 
            id, email as "email!", name as "full_name?", role::text as "role!", email_verified as "is_verified!", created_at as "created_at!", updated_at as "updated_at!", is_disabled as "is_disabled!", message_limit as "message_limit!", messages_used as "messages_used!"
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    match user {
        Some(u) => Ok(Json(u)),
        None => Err("User not found".to_string()),
    }
}

/// Update user role
/// PATCH /admin/users/{id}/role
pub async fn update_user_role(
    State(state): State<AppState>,
    Path(user_id): Path<uuid::Uuid>,
    Json(req): Json<UpdateRoleRequest>,
) -> Result<Json<UserAdminView>, String> {
    let user = sqlx::query_as!(
        UserAdminView,
        r#"
        UPDATE users
        SET role = $2::text::user_role, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email as "email!", name as "full_name?", role::text as "role!", email_verified as "is_verified!", created_at as "created_at!", updated_at as "updated_at!", is_disabled as "is_disabled!", message_limit as "message_limit!", messages_used as "messages_used!"
        "#,
        user_id,
        req.role.to_string()
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    match user {
        Some(u) => Ok(Json(u)),
        None => Err("User not found".to_string()),
    }
}

/// Delete user (Hard Delete)
/// DELETE /admin/users/{id}
pub async fn delete_user(
    State(state): State<AppState>,
    Path(user_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, String> {
    // Check if user exists first? Nah, just delete.
    let result = sqlx::query!("DELETE FROM users WHERE id = $1", user_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("User not found".to_string());
    }

    Ok(Json(serde_json::json!({
        "status": "success",
        "message": "User deleted successfully"
    })))
}

/// Get system stats
/// GET /admin/stats
pub async fn get_stats(State(state): State<AppState>) -> Result<Json<AdminStats>, String> {
    let users_count = sqlx::query_scalar!("SELECT count(*) FROM users")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or(0);

    let active_24h = sqlx::query_scalar!(
        "SELECT count(*) FROM users WHERE updated_at > NOW() - INTERVAL '24 hours'"
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or(0);

    let total_conversations = sqlx::query_scalar!("SELECT count(*) FROM conversations")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or(0);

    let total_messages = sqlx::query_scalar!("SELECT count(*) FROM chat_messages")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or(0);

    // Fetch user growth (over last 6 months)
    let user_growth = sqlx::query!(
        r#"
        SELECT
            trim(to_char(date_trunc('month', created_at), 'Month')) as "label!",
            count(*) as "value!"
        FROM users
        WHERE created_at > NOW() - INTERVAL '6 months'
        GROUP BY 1, date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .into_iter()
    .map(|r| DataPoint {
        label: r.label,
        value: r.value as i32,
    })
    .collect();

    // Fetch message activity (over last 7 days)
    let message_activity = sqlx::query!(
        r#"
        SELECT
            to_char(date_trunc('day', created_at), 'Dy') as "label!",
            count(*) as "value!"
        FROM chat_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY 1, date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .into_iter()
    .map(|r| DataPoint {
        label: r.label,
        value: r.value as i32,
    })
    .collect();

    Ok(Json(AdminStats {
        total_users: users_count as i32,
        active_users_24h: active_24h as i32,
        total_conversations: total_conversations as i32,
        total_messages: total_messages as i32,
        user_growth,
        message_activity,
    }))
}

// ============================================================================
// QUOTA MANAGEMENT
// ============================================================================

/// Get a user's quota/usage info
/// GET /admin/users/{id}/quota
pub async fn get_user_quota(
    State(state): State<AppState>,
    Path(user_id): Path<uuid::Uuid>,
) -> Result<Json<UserQuotaResponse>, String> {
    let row = sqlx::query!(
        r#"
        SELECT id, email as "email!", is_disabled, message_limit, messages_used
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "User not found".to_string())?;

    Ok(Json(UserQuotaResponse {
        id: row.id,
        email: row.email,
        is_disabled: row.is_disabled,
        message_limit: row.message_limit,
        messages_used: row.messages_used,
    }))
}

/// Set a user's message limit
/// PATCH /admin/users/{id}/quota/limit
///
/// Admins can raise or lower the per-user AI message limit.
/// Set to 0 to prevent any AI usage without disabling the account.
pub async fn set_user_message_limit(
    State(state): State<AppState>,
    Path(user_id): Path<uuid::Uuid>,
    Json(req): Json<SetMessageLimitRequest>,
) -> Result<Json<UserQuotaResponse>, String> {
    if req.message_limit < 0 {
        return Err("message_limit must be >= 0".to_string());
    }

    let row = sqlx::query!(
        r#"
        UPDATE users
        SET message_limit = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email as "email!", is_disabled, message_limit, messages_used
        "#,
        user_id,
        req.message_limit
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "User not found".to_string())?;

    Ok(Json(UserQuotaResponse {
        id: row.id,
        email: row.email,
        is_disabled: row.is_disabled,
        message_limit: row.message_limit,
        messages_used: row.messages_used,
    }))
}

/// Enable or disable a user account
/// PATCH /admin/users/{id}/disable
///
/// Disabled users receive a 403 Forbidden on all chat endpoints.
/// Their account data and conversations are preserved.
pub async fn toggle_user_disabled(
    State(state): State<AppState>,
    Path(user_id): Path<uuid::Uuid>,
    Json(req): Json<ToggleUserRequest>,
) -> Result<Json<UserQuotaResponse>, String> {
    let row = sqlx::query!(
        r#"
        UPDATE users
        SET is_disabled = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email as "email!", is_disabled, message_limit, messages_used
        "#,
        user_id,
        req.disabled
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "User not found".to_string())?;

    Ok(Json(UserQuotaResponse {
        id: row.id,
        email: row.email,
        is_disabled: row.is_disabled,
        message_limit: row.message_limit,
        messages_used: row.messages_used,
    }))
}

/// Reset a user's message usage counter to zero
/// POST /admin/users/{id}/quota/reset
///
/// Useful for monthly resets or granting a user a fresh quota start.
pub async fn reset_user_usage(
    State(state): State<AppState>,
    Path(user_id): Path<uuid::Uuid>,
) -> Result<Json<UserQuotaResponse>, String> {
    let row = sqlx::query!(
        r#"
        UPDATE users
        SET messages_used = 0, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email as "email!", is_disabled, message_limit, messages_used
        "#,
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "User not found".to_string())?;

    Ok(Json(UserQuotaResponse {
        id: row.id,
        email: row.email,
        is_disabled: row.is_disabled,
        message_limit: row.message_limit,
        messages_used: row.messages_used,
    }))
}
