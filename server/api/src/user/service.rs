use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::{password, session};
use crate::user::{
    ChangePasswordRequest, ChangePasswordResponse, DeleteAccountResponse, SessionListResponse,
    UpdateProfileRequest, UserError, UserResponse,
};

// ===== User Retrieval =====

/// Get user by ID from database
pub async fn get_user_by_id(db: &PgPool, user_id: Uuid) -> Result<UserResponse, UserError> {
    let user = sqlx::query_as!(
        UserResponse,
        r#"
        SELECT id, email, email_verified, name, username, avatar_url, 
               role as "role: _", created_at
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        user_id
    )
    .fetch_one(db)
    .await?;

    Ok(user)
}

// ===== Profile Management =====

/// Update user profile
/// - Validates username uniqueness if changed
/// - Updates name, username, avatar_url
pub async fn update_profile(
    db: &PgPool,
    user_id: Uuid,
    req: UpdateProfileRequest,
) -> Result<UserResponse, UserError> {
    // Check username uniqueness if provided
    if let Some(ref username) = req.username {
        let existing = sqlx::query!(
            "SELECT id FROM users WHERE username = $1 AND id != $2",
            username,
            user_id
        )
        .fetch_optional(db)
        .await?;

        if existing.is_some() {
            return Err(UserError::UsernameAlreadyTaken);
        }
    }

    // Update profile
    sqlx::query!(
        r#"
        UPDATE users
        SET name = COALESCE($1, name),
            username = COALESCE($2, username),
            avatar_url = COALESCE($3, avatar_url)
        WHERE id = $4
        "#,
        req.name,
        req.username,
        req.avatar_url,
        user_id
    )
    .execute(db)
    .await?;

    // Return updated user
    get_user_by_id(db, user_id).await
}

// ===== Password Management =====

/// Change user password
/// - Verifies current password
/// - Validates new password strength
/// - Hashes new password
/// - Updates password in database
/// - Invalidates all sessions except current (for security)
pub async fn change_password(
    db: &PgPool,
    user_id: Uuid,
    current_session_token: &str,
    req: ChangePasswordRequest,
) -> Result<ChangePasswordResponse, UserError> {
    // Get current password hash
    let user = sqlx::query!("SELECT password_hash FROM users WHERE id = $1", user_id)
        .fetch_one(db)
        .await?;

    let current_hash = user
        .password_hash
        .ok_or(UserError::InvalidCurrentPassword)?;

    // Verify current password
    let is_valid = password::verify_password(&req.current_password, &current_hash)
        .map_err(|_| UserError::InvalidCurrentPassword)?;

    if !is_valid {
        return Err(UserError::InvalidCurrentPassword);
    }

    // Validate new password strength
    password::validate_password_strength(&req.new_password)
        .map_err(|_| UserError::InvalidCurrentPassword)?; // Map to user error

    // Hash new password
    let new_hash = password::hash_password(&req.new_password).map_err(|_| UserError::Internal)?;

    // Update password
    sqlx::query!(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        new_hash,
        user_id
    )
    .execute(db)
    .await?;

    // Invalidate all sessions except current
    session::invalidate_all_sessions_except(db, user_id, current_session_token)
        .await
        .map_err(|_| UserError::Internal)?;

    Ok(ChangePasswordResponse {
        message: "Password changed successfully. All other sessions have been logged out."
            .to_string(),
    })
}

// ===== Account Deletion =====

/// Soft delete user account
/// - Sets deleted_at timestamp
/// - Invalidates all sessions
/// - Data can be recovered within a period
pub async fn soft_delete_account(
    db: &PgPool,
    user_id: Uuid,
) -> Result<DeleteAccountResponse, UserError> {
    // Set deleted_at
    sqlx::query!("UPDATE users SET deleted_at = NOW() WHERE id = $1", user_id)
        .execute(db)
        .await?;

    // Invalidate all sessions
    session::invalidate_all_user_sessions(db, user_id)
        .await
        .map_err(|_| UserError::Internal)?;

    Ok(DeleteAccountResponse {
        message: "Account deactivated. Contact support within 30 days to recover.".to_string(),
    })
}

// ===== Session Management =====

/// Get all active sessions for a user
pub async fn get_user_sessions(
    db: &PgPool,
    user_id: Uuid,
) -> Result<SessionListResponse, UserError> {
    let sessions = sqlx::query_as!(
        crate::user::Session,
        r#"
        SELECT id, user_id, session_token, expires_at, 
               ip_address::TEXT as "ip_address?", user_agent, created_at
        FROM sessions
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
        "#,
        user_id
    )
    .fetch_all(db)
    .await?;

    Ok(SessionListResponse { sessions })
}

/// Revoke a specific session
pub async fn revoke_session(db: &PgPool, user_id: Uuid, session_id: Uuid) -> Result<(), UserError> {
    // Verify session belongs to user before deleting
    let result = sqlx::query!(
        "DELETE FROM sessions WHERE id = $1 AND user_id = $2",
        session_id,
        user_id
    )
    .execute(db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(UserError::SessionNotFound);
    }

    Ok(())
}
