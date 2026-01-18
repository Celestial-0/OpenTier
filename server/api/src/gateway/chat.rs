use axum::{
    routing::{get, post},
    Router,
};

use crate::chat::handlers::*;
use crate::gateway::AppState;

/// Chat routes (all protected by auth middleware)
pub fn routes() -> Router<AppState> {
    Router::new()
        // Conversation management
        .route("/conversations", post(create_conversation))
        .route("/conversations", get(list_conversations))
        .route(
            "/conversations/{id}",
            get(get_conversation)
                .patch(update_conversation)
                .delete(delete_conversation),
        )
        // Messaging
        .route("/conversations/{id}/messages", post(send_message))
        // Streaming
        .route("/conversations/{id}/stream", get(stream_chat))
}
