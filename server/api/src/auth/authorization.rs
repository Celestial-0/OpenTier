use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use sqlx::PgPool;

use crate::auth::Role;

/// Admin-only middleware
/// Requires auth middleware to run first
#[allow(dead_code)] // Reserved for future route-level middleware
pub async fn require_admin(
    State(db): State<PgPool>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Get user_id from extensions (set by auth middleware)
    let user_id = request
        .extensions()
        .get::<uuid::Uuid>()
        .copied()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Get user role from database
    let user = sqlx::query!(
        r#"
        SELECT role as "role: Role"
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        user_id
    )
    .fetch_optional(&db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    // Check if user is admin
    if !user.role.is_admin() {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(next.run(request).await)
}
