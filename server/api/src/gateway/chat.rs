use axum::{
    routing::{get, post},
    Router,
};

use crate::chat::handlers::*;
use crate::gateway::AppState;

/// Chat routes
///
/// - **Conversation management** routes (`/conversations`, `/conversations/{id}`, etc.)
///   are returned by this function and have `auth_middleware` applied upstream in the gateway.
///
/// - **Messaging / Streaming** routes (`/conversations/{id}/messages` and
///   `/conversations/{id}/stream`) are in `message_routes()` and have only the
///   `chat_quota_middleware` applied (no mandatory auth), allowing anonymous IP-based use.
pub fn routes() -> Router<AppState> {
    Router::new()
        // Conversation management (auth required — applied in gateway)
        .route("/conversations", post(create_conversation))
        .route("/conversations", get(list_conversations))
        .route(
            "/conversations/{id}",
            get(get_conversation)
                .patch(update_conversation)
                .delete(delete_conversation),
        )
        // AI title generation
        .route(
            "/conversations/{id}/generate-title",
            post(generate_conversation_title),
        )
}

/// Message & streaming routes — protected only by quota middleware (not mandatory auth).
/// Anonymous users (IP-based free tier) can send messages without signing up.
pub fn message_routes() -> Router<AppState> {
    Router::new()
        // Messaging
        .route("/conversations/{id}/messages", post(send_message))
        // Streaming
        .route("/conversations/{id}/stream", post(stream_chat))
}

/// Unauthenticated / metadata chat routes
/// Used for fetching IP quota limits safely without trigger error constraints.
pub fn unauth_routes() -> Router<AppState> {
    Router::new().route("/quota", get(get_quota))
}
