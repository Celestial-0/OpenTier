//! Authentication and Authorization middleware
//!
//! Provides middleware for session validation and role-based access control.

use axum::{
    extract::{Request, State},
    http::{StatusCode, header},
    middleware::Next,
    response::Response,
};

use crate::auth::{AuthError, Role, session};
use crate::gateway::AppState;

// ===== Authentication Middleware =====

/// Auth middleware that validates session and injects user_id and role
///
/// Extracts the Bearer token from the Authorization header, validates the session,
/// and injects both user_id and role into request extensions for downstream handlers.
/// This eliminates the need for additional DB queries in authorization middleware.
///
/// # Errors
/// Returns `UNAUTHORIZED` if:
/// - Authorization header is missing
/// - Bearer token is invalid
/// - Session is not found or expired
pub async fn auth_middleware(
    State(app_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Extract Bearer token
    let session_token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Validate session and get user_id AND role (single DB query)
    let (user_id, role) = session::get_user_from_session(&app_state.db, session_token)
        .await
        .map_err(|e| match e {
            AuthError::SessionNotFound => StatusCode::UNAUTHORIZED,
            AuthError::TokenExpired => StatusCode::UNAUTHORIZED,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    // Inject both user_id and role into request extensions
    request.extensions_mut().insert(user_id);
    request.extensions_mut().insert(role);

    Ok(next.run(request).await)
}

// ===== Authorization Middleware =====

/// Admin-only middleware
///
/// Requires auth middleware to run first (to inject user_id and role).
/// Checks if the authenticated user has admin role.
///
/// **Performance:** No database query needed - role is read from request extensions.
///
/// # Errors
/// Returns `UNAUTHORIZED` if user_id or role is not in request extensions
/// Returns `FORBIDDEN` if user is not an admin
pub async fn require_admin(
    State(_app_state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Get role from extensions (set by auth middleware)
    // No database query needed!
    let role = request
        .extensions()
        .get::<Role>()
        .copied()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Check if user is admin
    if !role.is_admin() {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(next.run(request).await)
}
