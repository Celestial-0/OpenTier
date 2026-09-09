use axum::{
    Extension, Json,
    extract::{Path, Query, State},
    http::HeaderMap,
};
use sqlx::PgPool;
use uuid::Uuid;

use super::errors::UserError;
use super::service;
use super::types::*;
use crate::gateway::AppState;

// ============================================================================
// SELF-SERVICE USER HANDLERS
// ============================================================================

/// GET /v1/users/me
/// Get current authenticated user's profile
pub async fn me(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<UserResponse>, UserError> {
    let user = service::get_user_by_id(&db, user_id).await?;
    Ok(Json(user))
}

/// PATCH /v1/users/me
/// Update current authenticated user's profile
pub async fn update_profile(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<Json<UserResponse>, UserError> {
    let user = service::update_profile(&db, user_id, payload).await?;
    Ok(Json(user))
}

/// PUT/POST /v1/users/me/password
/// Change or set password for current user
pub async fn change_password(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    headers: HeaderMap,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<Json<ChangePasswordResponse>, UserError> {
    let session_token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(UserError::Unauthorized)?;

    let response = service::change_password(&state.db, user_id, session_token, payload).await?;

    if let Some(cache) = &state.session_cache {
        cache.evict_user_all(user_id).await;
    }

    Ok(Json(response))
}

/// DELETE /v1/users/me
/// Soft delete current authenticated user's account
pub async fn delete_account(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<DeleteAccountResponse>, UserError> {
    let response = service::soft_delete_account(&state.db, user_id).await?;

    if let Some(cache) = &state.session_cache {
        cache.evict_user_all(user_id).await;
    }

    Ok(Json(response))
}

/// GET /v1/users/me/sessions
/// List active sessions for current user
pub async fn list_sessions(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<SessionListResponse>, UserError> {
    let response = service::get_user_sessions(&db, user_id).await?;
    Ok(Json(response))
}

/// DELETE /v1/users/me/sessions/{session_id}
/// Revoke a specific session
pub async fn revoke_session(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(session_id): Path<Uuid>,
) -> Result<Json<()>, UserError> {
    service::revoke_session(&state.db, user_id, session_id).await?;

    if let Some(cache) = &state.session_cache {
        cache.evict_user_all(user_id).await;
    }

    Ok(Json(()))
}

/// GET /v1/users/me/credits
/// Get current user's credit balance and usage summary
pub async fn get_credits(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<crate::infra::postgres::billing_repo::UserCreditSummary>, UserError> {
    let summary = crate::infra::postgres::billing_repo::get_user_credit_summary(&state.db, user_id)
        .await
        .map_err(UserError::Database)?;
    Ok(Json(summary))
}

/// GET /v1/users/me/credits/transactions
/// Get current user's credit transaction ledger
pub async fn get_credit_transactions(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Query(query): Query<TransactionsQuery>,
) -> Result<Json<UserTransactionsResponse>, UserError> {
    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);

    let (transactions, total) =
        crate::infra::postgres::billing_repo::list_user_credit_transactions(
            &state.db,
            user_id,
            limit,
            offset,
            query.reason,
        )
        .await
        .map_err(UserError::Database)?;

    Ok(Json(UserTransactionsResponse {
        transactions,
        total,
        limit,
        offset,
    }))
}

/// GET /v1/users/me/credits/usage-summary
/// Get current user's credit usage breakdown by model
pub async fn get_usage_summary(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<crate::infra::postgres::billing_repo::ModelUsageItem>>, UserError> {
    let summary = crate::infra::postgres::billing_repo::get_user_usage_by_model(&state.db, user_id)
        .await
        .map_err(UserError::Database)?;
    Ok(Json(summary))
}

// ============================================================================
// ADMINISTRATIVE USER MANAGEMENT HANDLERS
// ============================================================================

/// GET /v1/users
/// List users with pagination and search (Admin only)
pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<UserListQuery>,
) -> Result<Json<UserListResponse>, UserError> {
    let limit = params.limit.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);
    let search_term = params.search.clone();

    let users = crate::infra::postgres::user_repo::list_users(
        &state.db,
        limit,
        offset,
        search_term.clone(),
    )
    .await
    .map_err(UserError::Database)?;

    let total_count =
        crate::infra::postgres::user_repo::count_users(&state.db, search_term.clone()).await?;

    Ok(Json(UserListResponse {
        users,
        total_count,
        limit: limit as i32,
        offset: offset as i32,
    }))
}

/// GET /v1/users/{id}
/// Get single user details (Admin only)
pub async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserAdminView>, UserError> {
    let user = crate::infra::postgres::user_repo::get_user_view(&state.db, user_id).await?;

    match user {
        Some(u) => Ok(Json(u)),
        None => Err(UserError::NotFound("user")),
    }
}

/// PATCH /v1/users/{id}
/// Modify user state such as disabling/enabling the account or changing role
pub async fn update_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(req): Json<AdminUpdateUserRequest>,
) -> Result<Json<UserAdminView>, UserError> {
    if let Some(disabled) = req.is_disabled.or(req.disabled) {
        crate::infra::postgres::user_repo::set_disabled(&state.db, user_id, disabled)
            .await?
            .ok_or_else(|| UserError::NotFound("user"))?;
    }

    if let Some(role) = req.role {
        crate::infra::postgres::user_repo::update_role(&state.db, user_id, role).await?;
    }

    let user = crate::infra::postgres::user_repo::get_user_view(&state.db, user_id)
        .await?
        .ok_or_else(|| UserError::NotFound("user"))?;

    Ok(Json(user))
}

/// DELETE /v1/users/{id}
/// Hard delete user (Admin only)
pub async fn delete_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, UserError> {
    let affected = crate::infra::postgres::user_repo::hard_delete_user(&state.db, user_id).await?;

    if affected == 0 {
        return Err(UserError::NotFound("user"));
    }

    Ok(Json(serde_json::json!({
        "status": "success",
        "message": "User deleted successfully"
    })))
}

/// PATCH /v1/users/{id}/role
/// Update user role (Admin only)
pub async fn update_user_role(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(req): Json<UpdateRoleRequest>,
) -> Result<Json<UserAdminView>, UserError> {
    let user =
        crate::infra::postgres::user_repo::update_role(&state.db, user_id, req.role.to_string())
            .await?;

    match user {
        Some(u) => Ok(Json(u)),
        None => Err(UserError::NotFound("user")),
    }
}

/// PATCH /v1/users/{id}/disable
/// Enable or disable a user account (Admin only)
pub async fn toggle_user_disabled(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(req): Json<ToggleUserRequest>,
) -> Result<Json<UserAdminView>, UserError> {
    crate::infra::postgres::user_repo::set_disabled(&state.db, user_id, req.disabled)
        .await?
        .ok_or_else(|| UserError::NotFound("user"))?;

    let user = crate::infra::postgres::user_repo::get_user_view(&state.db, user_id)
        .await?
        .ok_or_else(|| UserError::NotFound("user"))?;

    Ok(Json(user))
}

/// GET /v1/users/{id}/credits
/// Get a user's credit balance and recent transactions (Admin only)
pub async fn get_user_credits(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<AdminUserCreditsResponse>, UserError> {
    let summary = crate::infra::postgres::billing_repo::get_user_credit_summary(&state.db, user_id)
        .await
        .map_err(UserError::Database)?;

    let (recent_transactions, _) =
        crate::infra::postgres::billing_repo::list_user_credit_transactions(
            &state.db, user_id, 20, 0, None,
        )
        .await
        .map_err(UserError::Database)?;

    Ok(Json(AdminUserCreditsResponse {
        user_id,
        summary,
        recent_transactions,
    }))
}

/// POST /v1/users/{id}/credits/adjustments
/// Adjust a user's credit balance (+ or -) (Admin only)
pub async fn adjust_user_credits(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(req): Json<AdjustCreditsRequest>,
) -> Result<Json<AdjustCreditsResponse>, UserError> {
    if req.delta.abs() < 0.0001 {
        return Err(UserError::BadRequest(
            "delta magnitude must be >= 0.0001".into(),
        ));
    }

    let reason = req.reason.as_deref().unwrap_or("admin_adjustment");
    if !["admin_adjustment", "grant", "refund"].contains(&reason) {
        return Err(UserError::BadRequest(
            "reason must be 'admin_adjustment', 'grant', or 'refund'".into(),
        ));
    }

    let (new_balance, tx_id) = crate::infra::postgres::billing_repo::admin_adjust_user_credits(
        &state.db, user_id, req.delta, reason, req.note,
    )
    .await
    .map_err(UserError::Database)?;

    Ok(Json(AdjustCreditsResponse {
        user_id,
        delta: req.delta,
        new_balance,
        transaction_id: tx_id,
        message: format!("Successfully adjusted user credits by {:.4}", req.delta),
    }))
}
