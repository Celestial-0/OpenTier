//! Usage Quota & Credit Hold Middleware
//!
//! Enforces credit reservation for authenticated users and windowed anonymous budgets.

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

/// Default number of free messages allowed per IP address for unauthenticated users.
pub const DEFAULT_ANONYMOUS_FREE_MESSAGES: i32 = 5;
/// Backward-compatible alias for the default anonymous free tier limit.
pub const IP_FREE_MESSAGES: i32 = DEFAULT_ANONYMOUS_FREE_MESSAGES;

// ============================================================================
// EXTENSION TYPES
// ============================================================================

/// Carried by the quota middleware for anonymous (IP-based) requests.
#[derive(Clone, Debug)]
pub struct PeerIp(pub String);

/// Carried by the quota middleware for credit holds.
#[derive(Clone, Debug)]
pub struct CreditHoldKey(pub String);

// ============================================================================
// QUOTA MIDDLEWARE
// ============================================================================

/// Chat quota middleware — apply to message/stream routes only.
pub async fn chat_quota_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, Response> {
    // Short-circuit if limits are disabled (self-hosted deployments)
    if !state.config.usage_limits_enabled {
        return Ok(next.run(request).await);
    }

    let bearer_token = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_owned());

    match bearer_token {
        Some(ref token) => {
            handle_authenticated_quota(&state, token, &mut request).await?;
        }
        None => {
            let peer_ip = request
                .headers()
                .get("cf-connecting-ip")
                .or_else(|| request.headers().get("x-real-ip"))
                .or_else(|| request.headers().get("x-forwarded-for"))
                .and_then(|h| h.to_str().ok())
                .map(|s| s.split(',').next().unwrap_or("").trim().to_string())
                .unwrap_or_else(|| {
                    request
                        .extensions()
                        .get::<ConnectInfo<SocketAddr>>()
                        .map(|ci| ci.0.ip().to_string())
                        .unwrap_or_else(|| "unknown".to_string())
                });

            handle_ip_quota(&state, &peer_ip).await?;

            request.extensions_mut().insert(PeerIp(peer_ip));
        }
    }

    Ok(next.run(request).await)
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async fn handle_authenticated_quota(
    state: &AppState,
    token: &str,
    request: &mut Request,
) -> Result<(), Response> {
    let (user_id, role) = session::get_user_from_session(&state.db, token)
        .await
        .map_err(|_| quota_error(StatusCode::UNAUTHORIZED, "Invalid or expired session", None))?;

    let is_disabled = crate::infra::postgres::user_repo::is_user_disabled(&state.db, user_id)
        .await
        .map_err(|e| {
            warn!("DB error fetching user status for {}: {}", user_id, e);
            quota_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to verify account status",
                None,
            )
        })?
        .ok_or_else(|| quota_error(StatusCode::UNAUTHORIZED, "User not found", None))?;

    if is_disabled {
        return Err(quota_error(
            StatusCode::FORBIDDEN,
            "Your account has been disabled by an administrator. Please contact support.",
            None,
        ));
    }

    // Credit-hold enforcement
    if state.config.credits_enforced {
        use crate::infra::billing::{self, ReserveOutcome};
        let _ = crate::infra::postgres::billing_repo::ensure_user_balance_initialized(
            &state.db, user_id,
        )
        .await;
        let est = state.config.credit_reserve_estimate.max(0.0);
        let idem_key = request
            .headers()
            .get("idempotency-key")
            .and_then(|v| v.to_str().ok())
            .map(str::to_string)
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        let outcome = billing::reserve_keyed(&state.db, user_id, est, Some(&idem_key)).await;
        match outcome {
            Ok(ReserveOutcome::Reserved | ReserveOutcome::Duplicate) => {
                request.extensions_mut().insert(CreditHoldKey(idem_key));
                request.extensions_mut().insert(user_id);
                request.extensions_mut().insert(role);
                return Ok(());
            }
            Ok(ReserveOutcome::Insufficient) => {
                return Err(quota_error(
                    StatusCode::PAYMENT_REQUIRED,
                    "Insufficient credits. Please top up to continue.",
                    Some(json!({"code": "insufficient_credits"})),
                ));
            }
            Err(e) => {
                tracing::warn!("credit reserve failed for {}: {}", user_id, e);
                return Err(quota_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to verify credits",
                    None,
                ));
            }
        }
    }

    request.extensions_mut().insert(user_id);
    request.extensions_mut().insert(role);
    Ok(())
}

async fn handle_ip_quota(state: &AppState, peer_ip: &str) -> Result<(), Response> {
    let free_limit = state.config.anonymous_free_messages;

    if state.config.credits_enforced
        && let Some(redis) = &state.redis
    {
        use sha2::{Digest, Sha256};
        let digest = Sha256::digest(peer_ip.as_bytes());
        let ip_hash = format!(
            "{:x}",
            u128::from_le_bytes(digest[..16].try_into().unwrap_or([0; 16]))
        );
        let allowed = crate::infra::billing::anon_budget_allow(
            redis,
            &ip_hash,
            i64::from(free_limit),
            86_400,
        )
        .await;
        if !allowed {
            return Err(quota_error(
                StatusCode::PAYMENT_REQUIRED,
                &format!("You have used your {free_limit} free messages. Sign up to get 10 free credits."),
                Some(json!({
                    "code": "insufficient_credits",
                    "signup_required": true,
                    "message_limit": free_limit,
                })),
            ));
        }
        return Ok(());
    }

    // Fallback: check ip_usage table
    let messages_used = crate::infra::postgres::user_repo::record_and_get_ip_usage(&state.db, peer_ip)
        .await
        .map_err(|e| {
            warn!("DB error in ip_usage upsert for {}: {}", peer_ip, e);
            quota_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to verify usage quota",
                None,
            )
        })?;

    if messages_used > free_limit {
        return Err(quota_error(
            StatusCode::TOO_MANY_REQUESTS,
            &format!("You have used all {free_limit} free messages. Sign up to get 10 free credits."),
            Some(json!({
                "messages_used": messages_used - 1,
                "message_limit": free_limit,
                "signup_required": true,
            })),
        ));
    }

    Ok(())
}

fn quota_error(status: StatusCode, message: &str, extra: Option<serde_json::Value>) -> Response {
    let mut body = json!({
        "error": message,
        "status": status.as_u16(),
    });

    if let Some(extra_val) = extra
        && let (Some(obj), Some(extra_obj)) = (body.as_object_mut(), extra_val.as_object())
    {
        for (k, v) in extra_obj {
            obj.insert(k.clone(), v.clone());
        }
    }

    (status, axum::Json(body)).into_response()
}
