pub mod admin;
pub mod auth;
pub mod chat;
pub mod health;
pub mod user;

use axum::{Router, extract::FromRef, middleware, response::Html};
use sqlx::PgPool;

use tower_http::services::ServeFile;

use crate::config::{cors::build_cors_layer, env::Config};
use crate::grpc::IntelligenceClient;

// Define shared state type
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Config,
    pub intelligence_client: IntelligenceClient,
}

// Implement FromRef to allow extracting PgPool from AppState
impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> PgPool {
        state.db.clone()
    }
}

pub fn router(db: PgPool, config: Config, intelligence_client: IntelligenceClient) -> Router {
    let app_state = AppState {
        db,
        config: config.clone(),
        intelligence_client,
    };

    // Build CORS layer from configuration
    let cors = build_cors_layer(&config.cors);

    // Request logging layer
    let trace = tower_http::trace::TraceLayer::new_for_http();

    Router::new()
        .merge(Router::new().route("/", axum::routing::get(home)))
        .nest("/health", health::routes())
        .nest("/auth", auth::routes())
        .nest(
            "/user",
            user::routes()
                // Apply auth middleware to all user routes
                .layer(middleware::from_fn_with_state(
                    app_state.clone(),
                    crate::middleware::auth_middleware,
                )),
        )
        .nest(
            "/chat",
            chat::routes()
                // Apply auth middleware to all chat routes
                .layer(middleware::from_fn_with_state(
                    app_state.clone(),
                    crate::middleware::auth_middleware,
                )),
        )
        .nest(
            "/admin",
            admin::router()
                .layer(middleware::from_fn_with_state(
                    app_state.clone(),
                    crate::middleware::require_admin,
                ))
                .layer(middleware::from_fn_with_state(
                    app_state.clone(),
                    crate::middleware::auth_middleware,
                )),
        )
        .layer(cors) // Apply CORS to all routes
        .layer(trace) // Apply Request Logging
        .with_state(app_state)
        .route_service("/favicon.ico", ServeFile::new("public/favicon.ico"))
}

async fn home() -> Html<&'static str> {
    Html(
    r##"
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>OpenTier API Gateway</title>
          <link rel="icon" type="image/x-icon" href="/favicon.ico">

          <style>
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              background-color: #000000; /* jet black */
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
              Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue",
              Arial, sans-serif;
              color: #eaeaea;
            }

            body {
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
