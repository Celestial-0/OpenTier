use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::{password, session};
use crate::users::{
    ChangePasswordRequest, ChangePasswordResponse, DeleteAccountResponse, SessionListResponse,
    UpdateProfileRequest, UserError, UserResponse,
};

// ===== User Retrieval =====

/// Get user by ID from database
pub async fn get_user_by_id(db: &PgPool, user_id: Uuid) -> Result<UserResponse, UserError> {
    let user = crate::infra::postgres::user_repo::get_user_by_id(db, user_id).await?;

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
    let UpdateProfileRequest {
        name,
        username,
        avatar_url,
        contributor_opt_in,
    } = req;

    // Normalize optional string fields so blank values behave like "not provided".
    let normalized_name = name.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    });
    let normalized_username = username.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    });
    let normalized_avatar_url = avatar_url.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    });

    // Check username uniqueness if provided
    if let Some(ref username) = normalized_username
        && crate::infra::postgres::user_repo::username_taken(db, username, user_id).await?
    {
        return Err(UserError::UsernameAlreadyTaken);
    }

    // Update profile
    crate::infra::postgres::user_repo::update_profile(
        db,
        normalized_name,
        normalized_username,
        normalized_avatar_url,
        user_id,
    )
    .await?;

    // One-way self-service role escalation: user -> contributor.
    if contributor_opt_in.unwrap_or(false) {
        let current_role_label =
            crate::infra::postgres::user_repo::role_label_of(db, user_id).await?;

        if current_role_label.as_deref() == Some("user") {
            crate::infra::postgres::user_repo::promote_to_contributor(db, user_id).await?;

            // Keep active session authorization consistent with the user role change.
            crate::infra::postgres::user_repo::promote_active_sessions(db, user_id).await?;
        }
    }

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
    let ChangePasswordRequest {
        current_password,
        new_password,
    } = req;

    // Get current password hash
    let pw = crate::infra::postgres::user_repo::password_hash(db, user_id).await?;

    let had_local_password = pw.password_hash.is_some();

    if let Some(current_hash) = pw.password_hash {
        // Existing local-password account: current password is required.
        let current_password = current_password.ok_or(UserError::CurrentPasswordRequired)?;

        let is_valid = password::verify_password(&current_password, &current_hash)
            .map_err(|_| UserError::InvalidCurrentPassword)?;

        if !is_valid {
            return Err(UserError::InvalidCurrentPassword);
        }

        // Prevent setting the same password again.
        let is_reused = password::verify_password(&new_password, &current_hash)
            .map_err(|_| UserError::Internal)?;

        if is_reused {
            return Err(UserError::PasswordReuse);
        }
    }

    // Validate new password strength
    password::validate_password_strength(&new_password).map_err(|_| UserError::WeakPassword)?;

    // Hash new password
    let new_hash = password::hash_password(&new_password).map_err(|_| UserError::Internal)?;

    // Update password
    crate::infra::postgres::user_repo::set_password(db, new_hash, user_id).await?;

    // Invalidate all sessions except current
    session::invalidate_all_sessions_except(db, user_id, current_session_token)
        .await
        .map_err(|_| UserError::Internal)?;

    Ok(ChangePasswordResponse {
        message: if had_local_password {
            "Password changed successfully. All other sessions have been logged out.".to_string()
        } else {
            "Password created successfully. All other sessions have been logged out.".to_string()
        },
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
    // Set deleted_at + enqueue lifecycle event atomically (R3.1 outbox).
    let mut tx = db.begin().await.map_err(|_| UserError::Internal)?;
    crate::infra::postgres::user_repo::soft_delete(&mut *tx, user_id)
        .await
        .map_err(|_| UserError::Internal)?;
    crate::infra::postgres::outbox_repo::insert(
        &mut tx,
        crate::common::events::streams::LIFECYCLE_EVENTS,
        crate::common::events::event_types::USER_DELETED,
        &format!("user-deleted-{user_id}"),
        serde_json::json!({ "user_id": user_id.to_string() }),
    )
    .await
    .map_err(|_| UserError::Internal)?;
    tx.commit().await.map_err(|_| UserError::Internal)?;

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
    let sessions = crate::infra::postgres::user_repo::list_sessions(db, user_id).await?;

    Ok(SessionListResponse { sessions })
}

/// Revoke a specific session
pub async fn revoke_session(db: &PgPool, user_id: Uuid, session_id: Uuid) -> Result<(), UserError> {
    // Verify session belongs to user before deleting
    let affected =
        crate::infra::postgres::user_repo::revoke_session(db, session_id, user_id).await?;

    if affected == 0 {
        return Err(UserError::SessionNotFound);
    }

    Ok(())
}
