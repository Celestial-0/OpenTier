use axum::{
    Extension, Json,
    extract::{Path, State},
    http::HeaderMap,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::user::{
    ChangePasswordRequest, ChangePasswordResponse, DeleteAccountResponse, SessionListResponse,
    UpdateProfileRequest, UserError, UserResponse, service,
};

// ===== Get Current User =====

/// GET /user/me
/// Get current authenticated user's information
pub async fn me(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<UserResponse>, UserError> {
    let user = service::get_user_by_id(&db, user_id).await?;
    Ok(Json(user))
}

// ===== Update Profile =====

/// PATCH /user/update-profile
/// Update user profile information
pub async fn update_profile(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<Json<UserResponse>, UserError> {
    let user = service::update_profile(&db, user_id, payload).await?;
    Ok(Json(user))
}

// ===== Change Password =====

/// POST /user/change-password
/// Change user password
pub async fn change_password(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
    headers: HeaderMap,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<Json<ChangePasswordResponse>, UserError> {
    // Extract current session token from headers
    let session_token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(UserError::Unauthorized)?;

    let response = service::change_password(&db, user_id, session_token, payload).await?;
    Ok(Json(response))
}

// ===== Delete Account =====

/// DELETE /user/delete-account
/// Soft delete user account
pub async fn delete_account(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<DeleteAccountResponse>, UserError> {
    let response = service::soft_delete_account(&db, user_id).await?;
    Ok(Json(response))
}

// ===== Session Management =====

/// GET /user/list-sessions
/// List all active sessions for the current user
pub async fn list_sessions(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<SessionListResponse>, UserError> {
    let response = service::get_user_sessions(&db, user_id).await?;
    Ok(Json(response))
}

/// DELETE /user/sessions/{session_id}
/// Revoke a specific session
pub async fn revoke_session(
    State(db): State<PgPool>,
    Extension(user_id): Extension<Uuid>,
    Path(session_id): Path<Uuid>,
) -> Result<Json<()>, UserError> {
    service::revoke_session(&db, user_id, session_id).await?;
    Ok(Json(()))
}
