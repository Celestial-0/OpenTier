//! API Rate Limiting Middleware
//!
//! Provides rate limiting middleware using tower_governor for Axum applications.
//!
//! **IMPORTANT**: Server MUST use `.into_make_service_with_connect_info::<SocketAddr>()`
//! for the PeerIpKeyExtractor to extract client IPs correctly.

use axum::body::Body;
use governor::middleware::NoOpMiddleware;
use std::sync::Arc;
use tower_governor::{
    GovernorLayer,
    governor::{GovernorConfig, GovernorConfigBuilder},
    key_extractor::PeerIpKeyExtractor,
};

/// Rate limit configuration presets
#[derive(Debug, Clone, Copy)]
pub struct RateLimitConfig {
    pub per_second: u64,
    pub burst_size: u32,
}

impl RateLimitConfig {
    /// Strict: ~3 requests per minute with burst of 3
    /// Use for: sensitive operations like password reset, account recovery
    pub const STRICT: Self = Self {
        per_second: 20,
        burst_size: 3,
    };

    /// Standard: ~10 requests per minute with burst of 10
    /// Use for: authentication endpoints (signin, signup)
    pub const STANDARD: Self = Self {
        per_second: 6,
        burst_size: 10,
    };
}

/// Type alias for the default GovernorConfig using PeerIpKeyExtractor
pub type DefaultGovernorConfig = GovernorConfig<PeerIpKeyExtractor, NoOpMiddleware>;

/// Type alias for the default GovernorLayer
pub type DefaultGovernorLayer = GovernorLayer<PeerIpKeyExtractor, NoOpMiddleware, Body>;

/// Create a GovernorConfig from rate limit settings
fn create_governor_config(config: RateLimitConfig) -> Arc<DefaultGovernorConfig> {
    Arc::new(
        GovernorConfigBuilder::default()
            .per_second(config.per_second)
            .burst_size(config.burst_size)
            .finish()
            .expect("Failed to build governor config"),
    )
}

/// Create a rate limiting layer using the governor config
fn rate_limiter_layer(config: Arc<DefaultGovernorConfig>) -> DefaultGovernorLayer {
    GovernorLayer::new(config)
}

/// Standard rate limiter: ~10 req/min with burst of 10
/// Suitable for authentication endpoints (signin, signup, OAuth)
pub fn standard_rate_limiter() -> DefaultGovernorLayer {
    let config = create_governor_config(RateLimitConfig::STANDARD);
    rate_limiter_layer(config)
}

/// Strict rate limiter: ~3 req/min with burst of 3
/// Suitable for sensitive operations (password reset, account recovery)
pub fn strict_rate_limiter() -> DefaultGovernorLayer {
    let config = create_governor_config(RateLimitConfig::STRICT);
    rate_limiter_layer(config)
}

// Convenience functions for auth-specific rate limiting

/// Create rate limiter for standard authentication endpoints (signin, signup)
/// 10 requests per minute with burst of 10
pub fn auth_rate_limiter() -> DefaultGovernorLayer {
    standard_rate_limiter()
}

/// Create rate limiter for sensitive authentication operations
/// (password reset, forgot password, account recovery)
/// 3 requests per minute with burst of 3
pub fn sensitive_auth_rate_limiter() -> DefaultGovernorLayer {
    strict_rate_limiter()
}

// ===== Distributed sliding-window limiter =====

use axum::{
    extract::{ConnectInfo, Request, State},
    middleware::Next,
    response::Response,
};
use std::net::SocketAddr;

use crate::gateway::AppState;

fn client_ip(
    headers: &axum::http::HeaderMap,
    addr: &SocketAddr,
    trusted_cidrs: &[ipnetwork::IpNetwork],
) -> String {
    crate::common::client_ip::resolve(addr.ip(), headers, trusted_cidrs)
}

/// Cross-instance sliding-window limiter backed by Redis.
///
/// Bucket = `ot:api:rl:{first_path_segment}:{client_ip}` so auth / contact /
/// user traffic gets independent windows. Limits come from
/// `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS` config.
///
/// Fail-open: if Redis is unavailable (circuit open), requests pass — local
/// governor burst limits still apply. This is a deliberate availability-over-
/// strictness tradeoff (Redis is never authoritative).
pub async fn distributed_rate_limiter(
    State(app_state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Result<Response, axum::response::Response> {
    let Some(redis) = &app_state.redis else {
        return Ok(next.run(request).await);
    };

    // Reject early when the breaker is open instead of paying a round trip.
    if redis.is_open() {
        return Ok(next.run(request).await);
    }

    let ip = client_ip(
        request.headers(),
        &addr,
        &app_state.config.proxy.trusted_cidrs,
    );
    let tag = request
        .uri()
        .path()
        .split('/')
        .nth(1)
        .unwrap_or("root")
        .to_string();

    let limit = i64::from(app_state.config.rate_limit.max_requests.max(1));
    let window = std::time::Duration::from_secs(app_state.config.rate_limit.window_seconds.max(1));

    let bucket = format!("ot:api:rl:{tag}:{ip}");
    match redis.sliding_window_allow(&bucket, limit, window).await {
        Ok(true) => Ok(next.run(request).await),
        Ok(false) => {
            tracing::debug!(bucket = %bucket, "distributed rate limit exceeded");
            use axum::response::IntoResponse;
            let problem = crate::common::problem::ApiProblem::new(
                axum::http::StatusCode::TOO_MANY_REQUESTS,
                "rate_limited",
                "Too many requests, please try again later",
            )
            .with_request_id(uuid::Uuid::new_v4().to_string());
            let mut resp = problem.into_response();
            if let Ok(v) = axum::http::HeaderValue::from_str(&window.as_secs().to_string()) {
                resp.headers_mut()
                    .insert(axum::http::header::RETRY_AFTER, v);
            }
            Err(resp)
        }
        Err(e) => {
            tracing::warn!(error = %e, "rate limiter degraded; failing open");
            Ok(next.run(request).await)
        }
    }
}
