use std::sync::LazyLock;

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
use sqlx::types::ipnetwork::IpNetwork;

/// Token lifetimes from configuration (previously hardcoded despite the
/// settings existing in env).
static VERIFICATION_TOKEN_EXPIRY_SECS: LazyLock<i64> = LazyLock::new(|| {
    std::env::var("VERIFICATION_TOKEN_EXPIRY_SECONDS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(86_400)
});
static PASSWORD_RESET_TOKEN_EXPIRY_SECS: LazyLock<i64> = LazyLock::new(|| {
    std::env::var("PASSWORD_RESET_TOKEN_EXPIRY_SECONDS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3_600)
});

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
    if crate::infra::postgres::auth_repo::email_exists(db, &req.email).await? {
        return Err(AuthError::EmailAlreadyExists);
    }

    let requested_role = if req.contributor_opt_in {
        crate::auth::Role::Contributor
    } else {
        crate::auth::Role::User
    };

    // Create user
    let user_id = crate::infra::postgres::auth_repo::create_user(
        db,
        &req.email,
        &password_hash,
        req.name,
        req.username,
        &requested_role.to_string(),
    )
    .await?;

    // Generate verification token and OTP
    let verification_token = tokens::generate_token();
    let otp = tokens::generate_otp();
    let expires_at = Utc::now() + Duration::seconds(*VERIFICATION_TOKEN_EXPIRY_SECS);

    crate::infra::postgres::auth_repo::insert_verification_token(
        db,
        user_id,
        &verification_token,
        &otp,
        expires_at,
    )
    .await?;

    // Send verification email
    let email_service = EmailService::new(email_config.clone());
    if let Err(e) = email_service
        .send_verification_email(&req.email, &verification_token, &otp)
        .await
    {
        tracing::error!("Failed to send verification email: {:?}", e);
        // Don't fail signup if email fails, just log it
    }

    Ok(SignUpResponse {
        user_id,
        email: req.email,
        message: "Verification email sent. Please check your inbox.".to_string(),
    })
}

/// Sign in with email and password
/// - Verifies credentials
/// - Checks if email is verified
/// - Creates session with role
/// - Returns session token
pub async fn signin(
    db: &PgPool,
    req: SignInRequest,
    ip_address: Option<IpNetwork>,
    user_agent: Option<String>,
) -> Result<SignInResponse, AuthError> {
    // Find user by email
    let user = crate::infra::postgres::auth_repo::find_for_signin(db, &req.email)
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
    let (session_token, expires_at) =
        session::create_session(db, user.id, user.role, ip_address, user_agent).await?;

    Ok(SignInResponse {
        user_id: user.id,
        email: user.email,
        session_token,
        expires_at,
    })
}

/// Sign out a user by invalidating their session
pub async fn signout(db: &PgPool, session_token: &str) -> Result<(), AuthError> {
    session::invalidate_session_by_raw_token(db, session_token).await
}

/// Refresh a session token (extend expiration)
pub async fn refresh_session(
    db: &PgPool,
    req: RefreshRequest,
    ip_address: Option<IpNetwork>,
    user_agent: Option<String>,
) -> Result<RefreshResponse, AuthError> {
    // Validate current session and get user_id and role
    let (user_id, role) = session::get_user_from_session(db, &req.session_token).await?;

    // Invalidate old session
    session::invalidate_session_by_raw_token(db, &req.session_token).await?;

    // Create new session with same role
    let (new_token, expires_at) =
        session::create_session(db, user_id, role, ip_address, user_agent).await?;

    Ok(RefreshResponse {
        session_token: new_token,
        expires_at,
    })
}

// ===== Email Verification =====

/// Verify email address with token or OTP
pub async fn verify_email(
    db: &PgPool,
    req: VerifyEmailRequest,
) -> Result<VerifyEmailResponse, AuthError> {
    // Find verification token record
    let token_record = if let Some(token) = req.token {
        crate::infra::postgres::auth_repo::find_verification_by_token(db, &token).await?
    } else if let (Some(email), Some(otp)) = (req.email, req.otp) {
        // Find user first
        if let Some(user_id) = crate::infra::postgres::auth_repo::find_active_id(db, &email).await?
        {
            crate::infra::postgres::auth_repo::find_verification_by_user_otp(db, user_id, &otp)
                .await?
        } else {
            None
        }
    } else {
        return Err(AuthError::Validation(
            "Missing verification token or code".to_string(),
        ));
    };

    let token_record = token_record.ok_or(AuthError::InvalidToken)?;

    // Check if expired
    if token_record.expires_at < Utc::now() {
        return Err(AuthError::TokenExpired);
    }

    // Mark email as verified
    crate::infra::postgres::auth_repo::mark_email_verified(db, token_record.user_id).await?;

    // Delete verification tokens for this user
    crate::infra::postgres::auth_repo::delete_verification_tokens(db, token_record.user_id).await?;

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
    let user_id = crate::infra::postgres::auth_repo::find_active_id(db, &req.email).await?;

    // Always return success (don't reveal if email exists)
    if let Some(user_id) = user_id {
        // Generate reset token
        let reset_token = tokens::generate_token();
        let expires_at = Utc::now() + Duration::seconds(*PASSWORD_RESET_TOKEN_EXPIRY_SECS);

        // Delete any existing reset tokens for this user
        crate::infra::postgres::auth_repo::delete_reset_tokens(db, user_id).await?;

        // Create new reset token
        crate::infra::postgres::auth_repo::insert_reset_token(
            db,
            user_id,
            &reset_token,
            expires_at,
        )
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
    session_cache: Option<&crate::auth::session_cache::SessionCache>,
) -> Result<ResetPasswordResponse, AuthError> {
    // Validate password strength
    password::validate_password_strength(&req.new_password)?;

    // Find reset token
    let token_record = crate::infra::postgres::auth_repo::find_reset_token(db, &req.token)
        .await?
        .ok_or(AuthError::InvalidToken)?;

    // Check if expired
    if token_record.expires_at < Utc::now() {
        return Err(AuthError::TokenExpired);
    }

    // Hash new password
    let password_hash = password::hash_password(&req.new_password)?;

    // Update password
    crate::infra::postgres::auth_repo::set_password_hash(db, &password_hash, token_record.user_id)
        .await?;

    // Delete reset token
    crate::infra::postgres::auth_repo::delete_reset_token(db, &req.token).await?;

    // Invalidate all sessions for security
    session::invalidate_all_user_sessions(db, token_record.user_id).await?;

    // C4 fix: sweep the session cache so stolen tokens die immediately
    if let Some(cache) = session_cache {
        cache.evict_user_all(token_record.user_id).await;
    }

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
    let user = crate::infra::postgres::auth_repo::find_active_brief(db, &req.email).await?;

    // Always return success (don't reveal if email exists)
    if let Some(user) = user {
        // Check if already verified
        if user.email_verified {
            return Ok(ResendVerificationResponse {
                message: "Email is already verified.".to_string(),
            });
        }

        // Delete old verification tokens
        crate::infra::postgres::auth_repo::delete_verification_tokens(db, user.id).await?;

        // Generate new verification token and OTP
        let verification_token = tokens::generate_token();
        let otp = tokens::generate_otp();
        let expires_at = Utc::now() + Duration::seconds(*VERIFICATION_TOKEN_EXPIRY_SECS);

        crate::infra::postgres::auth_repo::insert_verification_token(
            db,
            user.id,
            &verification_token,
            &otp,
            expires_at,
        )
        .await?;

        // Send verification email
        let email_service = EmailService::new(email_config.clone());
        if let Err(e) = email_service
            .send_verification_email(&user.email, &verification_token, &otp)
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
    ip_address: Option<IpNetwork>,
    user_agent: Option<String>,
) -> Result<RecoverAccountResponse, AuthError> {
    // Find soft-deleted user by email
    let user = crate::infra::postgres::auth_repo::find_deleted_by_email(db, &req.email)
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
    crate::infra::postgres::auth_repo::restore_user(db, user.id).await?;

    // Create new session with user's role
    let (session_token, expires_at) =
        session::create_session(db, user.id, user.role, ip_address, user_agent).await?;

    Ok(RecoverAccountResponse {
        user_id: user.id,
        email: user.email,
        session_token,
        expires_at,
        message: "Account recovered successfully. Welcome back!".to_string(),
    })
}
