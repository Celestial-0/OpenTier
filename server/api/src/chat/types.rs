#![allow(dead_code)]
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// REQUEST TYPES
// ============================================================================

/// Create a new conversation
#[derive(Debug, Deserialize)]
pub struct CreateConversationRequest {
    pub title: Option<String>,
    #[serde(default)]
    pub metadata: serde_json::Value,
}

/// List conversations query parameters
#[derive(Debug, Deserialize)]
pub struct ListConversationsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    pub cursor: Option<String>,
}

fn default_limit() -> i32 {
    20
}

/// Get conversation query parameters
#[derive(Debug, Deserialize)]
pub struct ConversationQuery {
    #[serde(default = "default_message_limit")]
    pub limit: i32,
    pub before: Option<Uuid>, // message_id for pagination
}

fn default_message_limit() -> i32 {
    100
}

/// Update conversation metadata
#[derive(Debug, Deserialize)]
pub struct UpdateConversationRequest {
    pub title: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Send a message (non-streaming)
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub message: String,
    pub config: Option<ChatConfig>,
}

/// Chat configuration
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChatConfig {
    pub temperature: Option<f32>,
    pub max_tokens: Option<i32>,
    #[serde(default = "default_use_rag")]
    pub use_rag: bool,
    pub model: Option<String>,
}

fn default_use_rag() -> bool {
    true
}

/// Stream chat query parameters (SSE)
#[derive(Debug, Deserialize)]
pub struct StreamChatQuery {
    pub message: String,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: i32,
    #[serde(default = "default_use_rag")]
    pub use_rag: bool,
    pub model: Option<String>,
}

fn default_temperature() -> f32 {
    0.7
}

fn default_max_tokens() -> i32 {
    1000
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/// Conversation response
#[derive(Debug, Serialize)]
pub struct ConversationResponse {
    pub id: Uuid,
    pub user_id: String,
    pub title: Option<String>,
    pub message_count: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

/// List conversations response
#[derive(Debug, Serialize)]
pub struct ConversationListResponse {
    pub conversations: Vec<ConversationSummary>,
    pub next_cursor: Option<String>,
    pub total_count: i32,
}

/// Conversation summary for list view
#[derive(Debug, Serialize)]
pub struct ConversationSummary {
    pub id: Uuid,
    pub title: Option<String>,
    pub message_count: i32,
    pub last_message_preview: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Conversation with messages
#[derive(Debug, Serialize)]
pub struct ConversationWithMessages {
    pub id: Uuid,
    pub title: Option<String>,
    pub messages: Vec<ChatMessage>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Chat message
#[derive(Debug, Serialize)]
pub struct ChatMessage {
    pub id: Uuid,
    pub role: MessageRole,
    pub content: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub sources: Vec<SourceChunk>,
    pub created_at: i64,
}

/// Message role
#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

/// Source chunk from RAG retrieval
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SourceChunk {
    pub chunk_id: String,
    pub document_id: String,
    pub content: String,
    pub relevance_score: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_url: Option<String>,
}

/// Message response (non-streaming)
#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub message_id: Uuid,
    pub conversation_id: Uuid,
    pub role: MessageRole,
    pub content: String,
    pub sources: Vec<SourceChunk>,
    pub metrics: ChatMetrics,
    pub created_at: i64,
}

/// Chat metrics
#[derive(Debug, Serialize, Clone)]
pub struct ChatMetrics {
    pub tokens_used: i32,
    pub context_tokens: i32,
    pub response_tokens: i32,
    pub latency_ms: f32,
    pub sources_retrieved: i32,
}

/// Delete conversation response
#[derive(Debug, Serialize)]
pub struct DeleteConversationResponse {
    pub success: bool,
    pub conversation_id: Uuid,
    pub messages_deleted: i32,
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

/// SSE event types
#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamEvent {
    MessageStart {
        message_id: Uuid,
        conversation_id: Uuid,
    },
    Token {
        token: String,
    },
    Source {
        source: SourceChunk,
    },
    Metrics {
        metrics: ChatMetrics,
    },
    MessageEnd {
        message_id: Uuid,
        is_complete: bool,
    },
    Error {
        error: String,
        message: String,
    },
}
