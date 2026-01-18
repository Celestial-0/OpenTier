use axum::{
    Router,
    routing::{get, post},
};

use crate::auth::{
    forgot_password, oauth::oauth_authorize, oauth::oauth_callback, recover_account, refresh,
    resend_verification, reset_password, signin, signout, signup, verify,
};
use crate::gateway::AppState;
use crate::middleware::{auth_rate_limiter, sensitive_auth_rate_limiter};

pub fn routes() -> Router<AppState> {
    // OAuth routes (standard rate limiting)
    let oauth_routes = Router::new()
        .route("/oauth/{provider}/authorize", get(oauth_authorize))
        .route("/oauth/{provider}/callback", get(oauth_callback))
        .layer(auth_rate_limiter());

    // Standard auth routes (signin, signup, refresh, signout)
    let standard_auth_routes = Router::new()
        .route("/signin", post(signin))
        .route("/signup", post(signup))
        .route("/signout", post(signout))
        .route("/refresh", post(refresh))
        .route("/verify-email", get(verify))
        .layer(auth_rate_limiter());

    // Sensitive auth routes (password reset, account recovery)
    // These get stricter rate limiting
    let sensitive_auth_routes = Router::new()
        .route("/forgot-password", post(forgot_password))
        .route("/reset-password", post(reset_password))
        .route("/resend-verification", post(resend_verification))
        .route("/recover-account", post(recover_account))
        .layer(sensitive_auth_rate_limiter());

    // Merge all routes
    Router::new()
        .merge(oauth_routes)
        .merge(standard_auth_routes)
        .merge(sensitive_auth_routes)
}
