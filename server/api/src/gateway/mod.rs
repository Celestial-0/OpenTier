pub mod auth;
pub mod chat;
pub mod contact;
pub mod health;
pub mod metrics;
pub mod models;
pub mod providers;
pub mod resources;
pub mod users;

use std::sync::Arc;

use axum::{Router, extract::FromRef, middleware, response::Html};
use sqlx::PgPool;

pub use crate::common::API_V1_PREFIX;

use axum::http::{HeaderName, HeaderValue, Request};
use tower_http::request_id::{
    MakeRequestId, PropagateRequestIdLayer, RequestId, SetRequestIdLayer,
};
use tower_http::services::ServeFile;

use crate::auth::session_cache::SessionCache;
use crate::config::{cors::build_cors_layer, env::Config};
use crate::grpc::IntelligenceClient;
use crate::infra::redis::RedisHandle;

/// Request-id maker that prefers the caller-supplied
/// `X-Correlation-ID` header (so the distributed trace chain stays joined
/// REST -> gRPC -> stream consumers) and falls back to a generated UUID when
/// none is present. Paired with `SetRequestIdLayer` + `PropagateRequestIdLayer`.
#[derive(Clone, Default)]
pub struct CorrelationIdMaker;

impl MakeRequestId for CorrelationIdMaker {
    fn make_request_id<B>(&mut self, request: &Request<B>) -> Option<RequestId> {
        if let Some(existing) = request.headers().get("x-correlation-id")
            && !existing.is_empty()
        {
            return Some(RequestId::from(existing.clone()));
        }
        Some(RequestId::new(
            HeaderValue::from_str(&uuid::Uuid::new_v4().to_string())
                .unwrap_or_else(|_| HeaderValue::from_static("unknown")),
        ))
    }
}

// Define shared state type
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Config,
    pub intelligence_client: IntelligenceClient,
    /// Optional Redis-backed session cache; None when REDIS_URL is unset or
    /// unreachable at boot (all paths degrade to direct Postgres lookups).
    pub redis: Option<Arc<RedisHandle>>,
    pub session_cache: Option<Arc<SessionCache>>,
    pub start_time: std::time::Instant,
}

// Implement FromRef to allow extracting PgPool from AppState
impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> PgPool {
        state.db.clone()
    }
}

pub async fn router(db: PgPool, config: Config, intelligence_client: IntelligenceClient) -> Router {
    // Redis is optional infrastructure: absence never blocks startup.
    let (redis, session_cache) = match &config.redis.url {
        Some(url) => match RedisHandle::connect(url).await {
            Ok(handle) => {
                tracing::info!("✅ Connected to Redis");
                let handle = Arc::new(handle);
                let cache = Arc::new(SessionCache::new(handle.clone()));
                (Some(handle), Some(cache))
            }
            Err(e) => {
                tracing::warn!("⚠️ Redis unavailable ({}): continuing without cache", e);
                (None, None)
            }
        },
        None => (None, None),
    };

    let app_state = AppState {
        db,
        config: config.clone(),
        intelligence_client,
        redis,
        session_cache,
        start_time: std::time::Instant::now(),
    };

    // Build CORS layer from configuration
    let cors = build_cors_layer(&config.cors);

    // Request logging layer
    let trace = tower_http::trace::TraceLayer::new_for_http();

    // Per-group throttle helpers
    let dist = |st: AppState| {
        middleware::from_fn_with_state(st, crate::middleware::rate_limit::distributed_rate_limiter)
    };
    let auth_mw =
        |st: AppState| middleware::from_fn_with_state(st, crate::middleware::auth_middleware);
    let admin_mw =
        |st: AppState| middleware::from_fn_with_state(st, crate::middleware::require_admin);

    // ── /v1 public API surface ──────────────────────────────────────────
    let v1 = Router::new()
        .nest("/auth", auth::routes().layer(dist(app_state.clone())))
        .nest("/health", health::routes())
        .nest(
            "/contact",
            contact::routes()
                .layer(dist(app_state.clone()))
                .layer(crate::middleware::rate_limit::strict_rate_limiter()),
        )
        .nest(
            "/users",
            users::routes(app_state.clone())
                .layer(dist(app_state.clone()))
                .layer(auth_mw(app_state.clone())),
        )
        // Chat: conversation management (auth), message/stream (quota),
        // and unauthenticated quota reads.
        .nest(
            "/chat",
            chat::routes()
                .layer(dist(app_state.clone()))
                .layer(auth_mw(app_state.clone())),
        )
        .nest(
            "/chat",
            chat::message_routes().layer(dist(app_state.clone())).layer(
                middleware::from_fn_with_state(
                    app_state.clone(),
                    crate::middleware::chat_quota_middleware,
                ),
            ),
        )
        .nest(
            "/models",
            models::routes(app_state.clone()).layer(dist(app_state.clone())),
        )
        .nest(
            "/providers",
            providers::routes(app_state.clone()).layer(dist(app_state.clone())),
        )
        .nest(
            "/metrics",
            metrics::routes()
                .layer(admin_mw(app_state.clone()))
                .layer(auth_mw(app_state.clone())),
        )
        .nest(
            "/resources",
            resources::routes(app_state.clone()).layer(dist(app_state.clone())),
        )
        .with_state(app_state.clone());

    Router::new()
        .merge(Router::new().route("/", axum::routing::get(home)))
        .nest("/health", health::routes())
        .route("/openapi.json", axum::routing::get(openapi_json))
        .nest(API_V1_PREFIX, v1)
        .layer(cors) // Apply CORS to all routes
        .layer(trace) // Apply Request Logging
        // Assign + propagate a correlation id across every hop.
        // SetRequestIdLayer prefers an inbound X-Correlation-ID, else mints
        // one; PropagateRequestIdLayer echoes it on the response so clients
        // can join the trace through gRPC -> engine -> billing events.
        .layer(SetRequestIdLayer::new(
            HeaderName::from_static("x-correlation-id"),
            CorrelationIdMaker,
        ))
        .layer(PropagateRequestIdLayer::new(HeaderName::from_static(
            "x-correlation-id",
        )))
        .with_state(app_state)
        .route_service("/favicon.ico", ServeFile::new("public/favicon.ico"))
}

/// Live OpenAPI document.
async fn openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    use utoipa::OpenApi as _;
    axum::Json(crate::common::openapi::ApiDoc::openapi())
}

async fn home() -> Html<&'static str> {
    Html(
        r##"
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>OpenTier API Gateway</title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background-color: #000;
              color: #fff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .container {
              text-align: center;
              padding: 2rem 3rem;
              border: 0px;
              border-radius: 0px;
              background: linear-gradient(145deg, #050505, #0a0a0a);
              box-shadow: 0 0 40px rgba(255, 255, 255, 0.03);
            }

            h1 {
              margin: 0;
              font-size: 2rem;
              font-weight: 600;
              letter-spacing: 0.5px;
            }

            .subtitle {
              margin-top: 0.75rem;
              font-size: 0.95rem;
              color: #9a9a9a;
              letter-spacing: 0.3px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>OpenTier API Gateway</h1>
            <div class="subtitle">Secure · Scalable · Production Ready</div>
          </div>
        </body>
      </html>
      "##,
    )
}
