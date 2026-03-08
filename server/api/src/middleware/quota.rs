//! Usage Quota Middleware
//!
//! Enforces per-user and per-IP message quotas for the chat message/stream endpoints.
//!
//! ## Tier rules
//! | Tier         | Limit                    | Tracked by      |
//! |---|---|---|
//! | Anonymous    | 5 free messages          | Peer IP address |
//! | Authenticated| `message_limit` (def 10) | User DB row     |
//! | Self-hosted  | Unlimited                | `USAGE_LIMITS_ENABLED=false` |
//!
//! ## What this middleware does
//! 1. If `USAGE_LIMITS_ENABLED=false` → pass through immediately.
//! 2. If a `Authorization: Bearer <token>` header is present:
//!    - Validate the session (same single DB query as auth_middleware).
//!    - Check `is_disabled` and `messages_used >= message_limit`.
//!    - Inject `user_id: Uuid` and `role: Role` extensions so downstream handlers
//!      (which normally get these from auth_middleware) work unchanged.
//! 3. Otherwise (no token):
//!    - Enforce IP-level 5-message free tier.
//!    - Inject a `PeerIp` extension carrying the resolved IP.

use axum::{
    extract::{ConnectInfo, Request, State},
    http::{StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde_json::json;
use std::net::SocketAddr;
use tracing::warn;
use uuid::Uuid;

use crate::auth::session;
use crate::gateway::AppState;

/// Number of free messages allowed per IP address for unauthenticated users.
pub const IP_FREE_MESSAGES: i32 = 5;

// ============================================================================
// EXTENSION TYPES
// ============================================================================

/// Carried by the quota middleware to provide quota context to handlers.
#[derive(Clone, Debug)]
pub struct UserQuota {
    pub messages_used: i32,
    pub message_limit: i32,
}

/// Carried by the quota middleware for anonymous (IP-based) requests.
#[derive(Clone, Debug)]
pub struct PeerIp(pub String);

// ============================================================================
// QUOTA MIDDLEWARE
// ============================================================================

/// Chat quota middleware — apply to message/stream routes only.
pub async fn chat_quota_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, Response> {
    // ── Short-circuit if limits are disabled (self-hosted deployments) ──
    if !state.config.usage_limits_enabled {
        return Ok(next.run(request).await);
    }

    // Peek at the Authorization header to determine auth status
    let bearer_token = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_owned());

    match bearer_token {
        Some(ref token) => {
            // ── Authenticated path ──
            // The quota middleware runs instead of (not after) auth_middleware on these routes,
            // so it must also inject user_id + role into extensions.
            handle_authenticated_quota(&state, token, &mut request).await?;
        }
        None => {
            // ── Anonymous IP-based free tier ──
            let peer_ip = request.headers().get("cf-connecting-ip")
                .or_else(|| request.headers().get("x-real-ip"))
                .or_else(|| request.headers().get("x-forwarded-for"))
                .and_then(|h| h.to_str().ok())
                .map(|s| s.split(',').next().unwrap_or("").trim().to_string())
                .unwrap_or_else(|| {
                    request.extensions().get::<ConnectInfo<SocketAddr>>()
                        .map(|ci| ci.0.ip().to_string())
                        .unwrap_or_else(|| "unknown".to_string())
                });

            handle_ip_quota(&state, &peer_ip).await?;

            // Store IP so handlers can call increment_ip_usage later
            request.extensions_mut().insert(PeerIp(peer_ip));
        }
    }

    Ok(next.run(request).await)
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/// Handle quota enforcement for authenticated users.
///
/// Also injects `Uuid` (user_id) and `Role` so that `Extension(user_id)` and
/// `Extension(role)` extractors in downstream handlers work correctly — since
/// these routes are NOT protected by `auth_middleware`.
async fn handle_authenticated_quota(
    state: &AppState,
    token: &str,
    request: &mut Request,
) -> Result<(), Response> {
    // Validate session → get user_id + role (single DB query, same as auth_middleware)
    let (user_id, role) = session::get_user_from_session(&state.db, token)
        .await
        .map_err(|_| quota_error(StatusCode::UNAUTHORIZED, "Invalid or expired session", None))?;

    // Fetch quota fields for this specific user (second query, but lightweight index scan)
    let row = sqlx::query!(
        r#"
        SELECT messages_used, message_limit, is_disabled
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        warn!("DB error fetching user quota for {}: {}", user_id, e);
        quota_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to verify usage quota",
            None,
        )
    })?
    .ok_or_else(|| quota_error(StatusCode::UNAUTHORIZED, "User not found", None))?;

    // Check if the account is disabled by an admin
    if row.is_disabled {
        return Err(quota_error(
            StatusCode::FORBIDDEN,
            "Your account has been disabled by an administrator. Please contact support.",
            None,
        ));
    }

    let used = row.messages_used;
    let limit = row.message_limit;

    // Check if the user has hit their message limit
    if used >= limit {
        return Err(quota_error(
            StatusCode::TOO_MANY_REQUESTS,
            "You have reached your message limit. Please upgrade your plan or contact support.",
            Some(json!({
                "messages_used": used,
                "message_limit": limit,
                "upgrade_required": true,
            })),
        ));
    }

    // ── Inject extensions that downstream handlers expect ──
    // These mirror what auth_middleware injects, making handlers work transparently.
    request.extensions_mut().insert(user_id);    // Uuid
    request.extensions_mut().insert(role);       // Role
    request.extensions_mut().insert(UserQuota {
        messages_used: used,
        message_limit: limit,
    });

    Ok(())
}

/// Handle quota enforcement for anonymous (unauthenticated) IP-based users.
///
/// Uses an upsert to get-or-create the IP record, then checks whether
/// the count has already hit the free tier limit.
async fn handle_ip_quota(state: &AppState, peer_ip: &str) -> Result<(), Response> {
    // Upsert IP row — get current count without incrementing yet
    // (we increment after a *successful* response inside the handler)
    let row = sqlx::query!(
        r#"
        INSERT INTO ip_usage (ip_address, messages_used, first_seen, last_seen)
        VALUES ($1, 0, NOW(), NOW())
        ON CONFLICT (ip_address) DO UPDATE
            SET last_seen = NOW()
        RETURNING messages_used
        "#,
        peer_ip
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        warn!("DB error in ip_usage upsert for {}: {}", peer_ip, e);
        quota_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to verify usage quota",
            None,
        )
    })?;

    let used = row.messages_used;

    if used >= IP_FREE_MESSAGES {
        return Err(quota_error(
            StatusCode::TOO_MANY_REQUESTS,
            "You have used all 5 free messages. Sign up or log in to continue.",
            Some(json!({
                "messages_used": used,
                "message_limit": IP_FREE_MESSAGES,
                "signup_required": true,
            })),
        ));
    }

    Ok(())
}

// ============================================================================
// USAGE INCREMENT HELPERS
// ============================================================================

/// Increment the message counter for an authenticated user.
///
/// Call this after a successful AI response is sent/streamed.
pub async fn increment_user_usage(state: &AppState, user_id: Uuid) {
    if let Err(e) = sqlx::query!(
        "UPDATE users SET messages_used = messages_used + 1, updated_at = NOW() WHERE id = $1",
        user_id
    )
    .execute(&state.db)
    .await
    {
        warn!("Failed to increment user message count for {}: {}", user_id, e);
    }
}

/// Increment the message counter for an anonymous IP-based user.
///
/// Call this after a successful AI response is sent/streamed.
pub async fn increment_ip_usage(state: &AppState, peer_ip: &str) {
    if let Err(e) = sqlx::query!(
        r#"
        UPDATE ip_usage
        SET messages_used = messages_used + 1, last_seen = NOW()
        WHERE ip_address = $1
        "#,
        peer_ip
    )
    .execute(&state.db)
    .await
    {
        warn!("Failed to increment IP message count for {}: {}", peer_ip, e);
    }
}

// ============================================================================
// ERROR HELPERS
// ============================================================================

fn quota_error(
    status: StatusCode,
    message: &str,
    extra: Option<serde_json::Value>,
) -> Response {
    let mut body = json!({
        "error": message,
        "status": status.as_u16(),
    });

    if let Some(extra_val) = extra {
        if let (Some(obj), Some(extra_obj)) = (body.as_object_mut(), extra_val.as_object()) {
            for (k, v) in extra_obj {
                obj.insert(k.clone(), v.clone());
            }
        }
    }

    (status, axum::Json(body)).into_response()
}
