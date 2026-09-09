mod auth;
mod catalog;
mod chat;
mod common;
mod config;
mod email;
mod gateway;
mod grpc;
mod infra;
mod metrics;
mod middleware;
mod observability;
mod resources;
mod users;

use std::net::SocketAddr;
use std::path::PathBuf;

#[tokio::main]
async fn main() {
    // Load .env from the server root (one level up from the api crate).
    // Supports: cargo run from server/api/, or binary run from server/.
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let server_env = manifest_dir.parent().unwrap_or(&manifest_dir).join(".env");
    if server_env.exists() {
        dotenvy::from_path(&server_env).ok();
    } else {
        // Fallback: try CWD-relative paths (Docker / production)
        dotenvy::dotenv().ok();
    }

    // ---- Configuration ----
    let config = config::env::Config::from_env()
        .expect("Failed to load configuration. Please check your .env file and ensure all required variables are set.");

    // ---- Logging / observability ----
    observability::logging::init();

    tracing::info!("🔧 Configuration loaded successfully");
    // tracing::debug!("Server: {}:{}", config.server.host, config.server.port);
    // tracing::debug!("Database: {}", config.database.url);

    // ---- DB ----
    let db = config::database::connect(&config.database.url).await;

    // ---- Background Tasks ----
    auth::background::start_session_cleanup_task(db.clone());

    // Outbox relay (R3.1): drains transactional events into Redis Streams.
    if let Some(url) = &config.redis.url {
        match crate::infra::redis::RedisHandle::connect(url).await {
            Ok(handle) => {
                tokio::spawn(crate::infra::outbox_relay::run_relay(db.clone(), handle));
                tracing::info!("✅ Outbox relay started");
            }
            Err(e) => tracing::warn!("⚠️ Outbox relay disabled (Redis unreachable: {})", e),
        }
    }

    // ---- gRPC Client ----
    let intelligence_url = std::env::var("INTELLIGENCE_SERVICE_URL")
        .unwrap_or_else(|_| "http://[::1]:50051".to_string());

    // Attempt connection with graceful degradation
    // If Intelligence service is unavailable, log warning but continue startup
    let intelligence_client =
        match crate::grpc::client::IntelligenceClient::connect(&intelligence_url).await {
            Ok(client) => {
                tracing::info!(
                    "✅ Connected to Intelligence service at {}",
                    intelligence_url
                );
                client
            }
            Err(e) => {
                tracing::warn!(
                    "⚠️ Failed to connect to Intelligence service at {}: {}. \
                 Starting with lazy reconnection. AI features may be unavailable.",
                    intelligence_url,
                    e
                );
                // Create client that will attempt lazy reconnection on first use
                match crate::grpc::client::IntelligenceClient::connect_lazy(&intelligence_url).await
                {
                    Ok(client) => client,
                    Err(lazy_err) => {
                        tracing::error!(
                            "❌ Failed to create lazy connection to Intelligence service: {}. \
                         AI features will be unavailable.",
                            lazy_err
                        );
                        // Still try to create the client - it will error on actual use
                        crate::grpc::client::IntelligenceClient::connect(&intelligence_url)
                            .await
                            .expect(
                                "Failed to connect to intelligence service after multiple attempts",
                            )
                    }
                }
            }
        };

    // ---- Router ----
    let app = gateway::router(db.clone(), config.clone(), intelligence_client).await;

    // ---- Listener ----
    let addr = config::server::addr(&config.server.host, config.server.port);

    let listener = config::server::listener(addr).await;

    tracing::info!("🚀 API Gateway listening on http://{}", addr);

    // ---- Serve ----
    // IMPORTANT: Use into_make_service_with_connect_info for rate limiting to work
    // This allows PeerIpKeyExtractor to extract client IP addresses
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}
