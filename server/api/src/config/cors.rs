use axum::http::{
    Method,
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
};
use tower_http::cors::{Any, CorsLayer};

use super::env::CorsConfig;

/// Build CORS layer from configuration
pub fn build_cors_layer(config: &CorsConfig) -> CorsLayer {
    // Check if wildcard is enabled
    if config.allowed_origins.contains(&"*".to_string()) {
        tracing::info!("🌐 CORS: Allowing all origins (*)");
        return CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
            .allow_credentials(false); // Cannot use credentials with wildcard origin
    }

    // Parse specific origins
    let origins: Vec<_> = config
        .allowed_origins
        .iter()
        .filter_map(|origin| {
            origin.parse().ok().or_else(|| {
                tracing::warn!("⚠️  Invalid CORS origin: {}", origin);
                None
            })
        })
        .collect();

    if origins.is_empty() {
        tracing::warn!("⚠️  No valid CORS origins configured, defaulting to permissive mode");
        return CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
            .allow_credentials(false);
    }

    tracing::info!("🌐 CORS: Allowing {} specific origin(s)", origins.len());
    // for origin in &origins {
    //     tracing::debug!("   - {:?}", origin);
    // }

    // When using specific origins with credentials enabled,
    // we must specify allowed methods and headers (cannot use wildcards)
    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT])
        .allow_credentials(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wildcard_cors() {
        let config = CorsConfig {
            allowed_origins: vec!["*".to_string()],
        };
        let _layer = build_cors_layer(&config);
        // Should not panic
    }

    #[test]
    fn test_specific_origins() {
        let config = CorsConfig {
            allowed_origins: vec![
                "http://localhost:3000".to_string(),
                "https://app.example.com".to_string(),
            ],
        };
        let _layer = build_cors_layer(&config);
        // Should not panic
    }

    #[test]
    fn test_empty_origins() {
        let config = CorsConfig {
            allowed_origins: vec![],
        };
        let _layer = build_cors_layer(&config);
        // Should default to permissive mode
    }
}
