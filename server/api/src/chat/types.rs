#![allow(dead_code)]
use chrono::{DateTime, Utc};
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

/// Generate conversation title with AI
#[derive(Debug, Deserialize)]
pub struct GenerateTitleRequest {
    pub user_message: String,
    pub assistant_message: String,
}

/// Generate title response
#[derive(Debug, Serialize)]
pub struct GenerateTitleResponse {
    pub title: String,
}

/// Unified chat completion request (M6: content-negotiated SSE merge).
///
/// Configuration is supplied via the nested `config` object; when absent the
/// [`ChatConfig`] defaults apply.
#[derive(Debug, Deserialize)]
pub struct ChatCompletionRequest {
    pub message: String,
    #[serde(default)]
    pub config: Option<ChatConfig>,
    pub parent_id: Option<String>,
    pub user_message_id: Option<String>,
    pub assistant_message_id: Option<String>,
    pub regenerate_user_msg_id: Option<String>,
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

impl Default for ChatConfig {
    fn default() -> Self {
        ChatConfig {
            temperature: Some(0.7),
            max_tokens: Some(1000),
            use_rag: true,
            model: None,
        }
    }
}

fn default_use_rag() -> bool {
    true
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
    #[serde(with = "crate::common::timestamp")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "crate::common::timestamp")]
    pub updated_at: DateTime<Utc>,
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
    #[serde(with = "crate::common::timestamp")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "crate::common::timestamp")]
    pub updated_at: DateTime<Utc>,
}

/// Conversation with messages
#[derive(Debug, Serialize)]
pub struct ConversationWithMessages {
    pub id: Uuid,
    pub title: Option<String>,
    pub messages: Vec<ChatMessage>,
    #[serde(with = "crate::common::timestamp")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "crate::common::timestamp")]
    pub updated_at: DateTime<Utc>,
}

/// Chat message
#[derive(Debug, Serialize)]
pub struct ChatMessage {
    pub id: Uuid,
    pub role: MessageRole,
    pub content: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub sources: Vec<SourceChunk>,
    #[serde(with = "crate::common::timestamp")]
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
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
    #[serde(with = "crate::common::timestamp")]
    pub created_at: DateTime<Utc>,
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
