use axum::{
    extract::{Path, Query, State},
    Json,
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
            id, email as "email!", name as "full_name?", role::text as "role!", email_verified as "is_verified!", created_at as "created_at!", updated_at as "updated_at!"
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
            id, email as "email!", name as "full_name?", role::text as "role!", email_verified as "is_verified!", created_at as "created_at!", updated_at as "updated_at!"
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
        RETURNING id, email as "email!", name as "full_name?", role::text as "role!", email_verified as "is_verified!", created_at as "created_at!", updated_at as "updated_at!"
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

    let total_messages = sqlx::query_scalar!("SELECT count(*) FROM messages")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or(0);

    Ok(Json(AdminStats {
        total_users: users_count as i32,
        active_users_24h: active_24h as i32,
        total_conversations: total_conversations as i32,
        total_messages: total_messages as i32,
    }))
}
