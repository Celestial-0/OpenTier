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
