//! Centralized middleware module
//!
//! All application middleware is organized here for easy discovery and maintenance.

#![allow(dead_code)]
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};
use uuid::Uuid;

use crate::auth::Role;

pub mod auth;
pub mod rate_limit;

// Re-export commonly used middleware
pub use auth::{auth_middleware, require_admin};
pub use rate_limit::{auth_rate_limiter, sensitive_auth_rate_limiter};

/// Authenticated user extractor
///
/// Extracts user_id and role from request extensions (set by auth middleware).
/// Use this in protected route handlers to get the authenticated user.
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub id: Uuid,
    pub role: Role,
}

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let user_id = parts
            .extensions
            .get::<Uuid>()
            .copied()
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let role = parts
            .extensions
            .get::<Role>()
            .copied()
            .ok_or(StatusCode::UNAUTHORIZED)?;

        Ok(AuthenticatedUser { id: user_id, role })
    }
}
