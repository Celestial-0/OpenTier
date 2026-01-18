use chrono::{Duration, Utc};
use sqlx::PgPool;

use super::{
    AuthError, ForgotPasswordRequest, ForgotPasswordResponse, RecoverAccountRequest,
    RecoverAccountResponse, RefreshRequest, RefreshResponse, ResendVerificationRequest,
    ResendVerificationResponse, ResetPasswordRequest, ResetPasswordResponse, SignInRequest,
    SignInResponse, SignUpRequest, SignUpResponse, VerifyEmailRequest, VerifyEmailResponse,
    password, session, tokens,
};
use crate::email::EmailService;

// ===== Email/Password Authentication =====

/// Sign up a new user with email and password
/// - Validates email format and password strength
/// - Hashes password
/// - Creates user in database
/// - Generates verification token
/// - Sends verification email (stubbed for now)
pub async fn signup(
    db: &PgPool,
    req: SignUpRequest,
    email_config: &crate::config::env::EmailConfig,
) -> Result<SignUpResponse, AuthError> {
    // Validate password strength
    password::validate_password_strength(&req.password)?;

    // Hash password
    let password_hash = password::hash_password(&req.password)?;

    // Check if email already exists
    let existing_user = sqlx::query!("SELECT id FROM users WHERE email = $1", req.email)
        .fetch_optional(db)
        .await?;

    if existing_user.is_some() {
        return Err(AuthError::EmailAlreadyExists);
    }

    // Create user
    let user = sqlx::query!(
        r#"
        INSERT INTO users (email, password_hash, name, username, email_verified)
        VALUES ($1, $2, $3, $4, FALSE)
        RETURNING id
        "#,
        req.email,
        password_hash,
        req.name,
        req.username
    )
    .fetch_one(db)
    .await?;

    // Generate verification token
    let verification_token = tokens::generate_token();
    let expires_at = Utc::now() + Duration::hours(24);

    sqlx::query!(
        r#"
        INSERT INTO verification_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        "#,
        user.id,
        verification_token,
        expires_at
    )
    .execute(db)
    .await?;

    // Send verification email
    let email_service = EmailService::new(email_config.clone());
    if let Err(e) = email_service
        .send_verification_email(&req.email, &verification_token)
        .await
    {
        tracing::error!("Failed to send verification email: {:?}", e);
        // Don't fail signup if email fails, just log it
    }

    Ok(SignUpResponse {
        user_id: user.id,
        email: req.email,
        message: "Verification email sent. Please check your inbox.".to_string(),
    })
}

/// Sign in with email and password
/// - Verifies credentials
/// - Checks if email is verified
/// - Creates session with role
/// - Returns session token
pub async fn signin(db: &PgPool, req: SignInRequest) -> Result<SignInResponse, AuthError> {
    // Find user by email
    let user = sqlx::query!(
        r#"
        SELECT id, email, password_hash, email_verified, role as "role: crate::auth::Role"
        FROM users
        WHERE email = $1 AND deleted_at IS NULL
        "#,
        req.email
    )
    .fetch_optional(db)
    .await?
    .ok_or(AuthError::InvalidCredentials)?;

    // Verify password
    let password_hash = user.password_hash.ok_or(AuthError::InvalidCredentials)?;
    let is_valid = password::verify_password(&req.password, &password_hash)?;

    if !is_valid {
        return Err(AuthError::InvalidCredentials);
    }

    // Check if email is verified
    if !user.email_verified {
        return Err(AuthError::EmailNotVerified);
    }

    // Create session with user's role
    let (session_token, expires_at) = session::create_session(db, user.id, user.role).await?;

    Ok(SignInResponse {
        user_id: user.id,
        email: user.email,
        session_token,
        expires_at,
    })
}

/// Sign out a user by invalidating their session
pub async fn signout(db: &PgPool, session_token: &str) -> Result<(), AuthError> {
    session::invalidate_session(db, session_token).await
}

/// Refresh a session token (extend expiration)
pub async fn refresh_session(
    db: &PgPool,
    req: RefreshRequest,
) -> Result<RefreshResponse, AuthError> {
    // Validate current session and get user_id and role
    let (user_id, role) = session::get_user_from_session(db, &req.session_token).await?;

    // Invalidate old session
    session::invalidate_session(db, &req.session_token).await?;

    // Create new session with same role
    let (new_token, expires_at) = session::create_session(db, user_id, role).await?;

    Ok(RefreshResponse {
        session_token: new_token,
        expires_at,
    })
}

// ===== Email Verification =====

/// Verify email address with token
pub async fn verify_email(
    db: &PgPool,
    req: VerifyEmailRequest,
) -> Result<VerifyEmailResponse, AuthError> {
    // Find verification token
    let token_record = sqlx::query!(
        r#"
        SELECT user_id, expires_at
        FROM verification_tokens
        WHERE token = $1
        "#,
        req.token
    )
    .fetch_optional(db)
    .await?
    .ok_or(AuthError::InvalidToken)?;

    // Check if expired
    if token_record.expires_at < Utc::now() {
        return Err(AuthError::TokenExpired);
    }

    // Mark email as verified
    sqlx::query!(
        r#"
        UPDATE users
        SET email_verified = TRUE
        WHERE id = $1
        "#,
        token_record.user_id
    )
    .execute(db)
    .await?;

    // Delete verification token
    sqlx::query!(
        "DELETE FROM verification_tokens WHERE token = $1",
        req.token
    )
    .execute(db)
    .await?;

    Ok(VerifyEmailResponse {
        message: "Email verified successfully!".to_string(),
        email_verified: true,
    })
}

// ===== Password Reset =====

/// Send password reset email
pub async fn forgot_password(
    db: &PgPool,
    req: ForgotPasswordRequest,
    email_config: &crate::config::env::EmailConfig,
) -> Result<ForgotPasswordResponse, AuthError> {
    // Find user by email
    let user = sqlx::query!(
        "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL",
        req.email
    )
    .fetch_optional(db)
    .await?;

    // Always return success (don't reveal if email exists)
    if let Some(user) = user {
        // Generate reset token
        let reset_token = tokens::generate_token();
        let expires_at = Utc::now() + Duration::hours(1); // 1 hour expiry

        // Delete any existing reset tokens for this user
        sqlx::query!(
            "DELETE FROM password_reset_tokens WHERE user_id = $1",
            user.id
        )
        .execute(db)
        .await?;

        // Create new reset token
        sqlx::query!(
            r#"
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            "#,
            user.id,
            reset_token,
            expires_at
        )
        .execute(db)
        .await?;

        // Send reset email
        let email_service = EmailService::new(email_config.clone());
        if let Err(e) = email_service
            .send_password_reset_email(&req.email, &reset_token)
            .await
        {
            tracing::error!("Failed to send password reset email: {:?}", e);
            // Don't fail the request if email fails
        }
    }

    Ok(ForgotPasswordResponse {
        message: "If an account exists with that email, a password reset link has been sent."
            .to_string(),
    })
}

/// Reset password with token
pub async fn reset_password(
    db: &PgPool,
    req: ResetPasswordRequest,
) -> Result<ResetPasswordResponse, AuthError> {
    // Validate password strength
    password::validate_password_strength(&req.new_password)?;

    // Find reset token
    let token_record = sqlx::query!(
        r#"
        SELECT user_id, expires_at
        FROM password_reset_tokens
        WHERE token = $1
        "#,
        req.token
    )
    .fetch_optional(db)
    .await?
    .ok_or(AuthError::InvalidToken)?;

    // Check if expired
    if token_record.expires_at < Utc::now() {
        return Err(AuthError::TokenExpired);
    }

    // Hash new password
    let password_hash = password::hash_password(&req.new_password)?;

    // Update password
    sqlx::query!(
        r#"
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
        "#,
        password_hash,
        token_record.user_id
    )
    .execute(db)
    .await?;

    // Delete reset token
    sqlx::query!(
        "DELETE FROM password_reset_tokens WHERE token = $1",
        req.token
    )
    .execute(db)
    .await?;

    // Invalidate all sessions for security
    session::invalidate_all_user_sessions(db, token_record.user_id).await?;

    Ok(ResetPasswordResponse {
        message: "Password reset successfully. Please sign in with your new password.".to_string(),
    })
}

// ===== Resend Verification Email =====

/// Resend verification email to user
pub async fn resend_verification_email(
    db: &PgPool,
    req: ResendVerificationRequest,
    email_config: &crate::config::env::EmailConfig,
) -> Result<ResendVerificationResponse, AuthError> {
    // Find user by email
    let user = sqlx::query!(
        r#"
        SELECT id, email, email_verified
        FROM users
        WHERE email = $1 AND deleted_at IS NULL
        "#,
        req.email
    )
    .fetch_optional(db)
    .await?;

    // Always return success (don't reveal if email exists)
    if let Some(user) = user {
        // Check if already verified
        if user.email_verified {
            return Ok(ResendVerificationResponse {
                message: "Email is already verified.".to_string(),
            });
        }

        // Delete old verification tokens
        sqlx::query!(
            "DELETE FROM verification_tokens WHERE user_id = $1",
            user.id
        )
        .execute(db)
        .await?;

        // Generate new verification token
        let verification_token = tokens::generate_token();
        let expires_at = Utc::now() + Duration::hours(24);

        sqlx::query!(
            r#"
            INSERT INTO verification_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            "#,
            user.id,
            verification_token,
            expires_at
        )
        .execute(db)
        .await?;

        // Send verification email
        let email_service = EmailService::new(email_config.clone());
        if let Err(e) = email_service
            .send_verification_email(&user.email, &verification_token)
            .await
        {
            tracing::error!("Failed to send verification email: {:?}", e);
        }
    }

    Ok(ResendVerificationResponse {
        message:
            "If an unverified account exists with that email, a verification link has been sent."
                .to_string(),
    })
}

// ===== Account Recovery =====

/// Recover a soft-deleted account
pub async fn recover_account(
    db: &PgPool,
    req: RecoverAccountRequest,
) -> Result<RecoverAccountResponse, AuthError> {
    // Find soft-deleted user by email
    let user = sqlx::query!(
        r#"
        SELECT id, email, password_hash, deleted_at, role as "role: crate::auth::Role"
        FROM users
        WHERE email = $1 AND deleted_at IS NOT NULL
        "#,
        req.email
    )
    .fetch_optional(db)
    .await?
    .ok_or(AuthError::InvalidCredentials)?;

    // Verify password
    let password_hash = user.password_hash.ok_or(AuthError::InvalidCredentials)?;
    let is_valid = password::verify_password(&req.password, &password_hash)?;

    if !is_valid {
        return Err(AuthError::InvalidCredentials);
    }

    // Check if within recovery window (30 days)
    let deleted_at = user.deleted_at.ok_or(AuthError::InvalidCredentials)?;
    let recovery_deadline = deleted_at + Duration::days(30);

    if Utc::now() > recovery_deadline {
        return Err(AuthError::AccountRecoveryExpired);
    }

    // Restore account
    sqlx::query!(
        r#"
        UPDATE users
        SET deleted_at = NULL
        WHERE id = $1
        "#,
        user.id
    )
    .execute(db)
    .await?;

    // Create new session with user's role
    let (session_token, expires_at) = session::create_session(db, user.id, user.role).await?;

    Ok(RecoverAccountResponse {
        user_id: user.id,
        email: user.email,
        session_token,
        expires_at,
        message: "Account recovered successfully. Welcome back!".to_string(),
    })
}
