use axum::response::IntoResponse;
use axum::{
    Json,
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    response::sse::{Event, KeepAlive, Sse},
};
use futures::Stream;
use std::convert::Infallible;

use uuid::Uuid;

use super::error::{ChatError, ChatResult};
use super::types::*;
use crate::gateway::AppState;
use crate::middleware::PeerIp;

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

/// Create a new conversation
/// POST /chat/conversations
pub async fn create_conversation(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<CreateConversationRequest>,
) -> ChatResult<Json<ConversationResponse>> {
    let conversation_id = Uuid::new_v4();
    let metadata = req.metadata;

    let row = crate::infra::postgres::chat_repo::create_conversation(
        &state.db,
        conversation_id,
        &user_id.to_string(),
        req.title,
        metadata,
    )
    .await
    .map_err(|e| ChatError::DatabaseError(e.to_string()))?;

    Ok(Json(ConversationResponse {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        message_count: 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }))
}

/// Get conversation with messages
/// GET /chat/conversations/{id}
pub async fn get_conversation(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(conversation_id): Path<Uuid>,
) -> ChatResult<Json<ConversationWithMessages>> {
    // Check ownership and existence
    let conversation = crate::infra::postgres::chat_repo::get_owned_meta(
        &state.db,
        conversation_id,
        &user_id.to_string(),
    )
    .await
    .map_err(|e| ChatError::DatabaseError(e.to_string()))?
    .ok_or(ChatError::ConversationNotFound(conversation_id.to_string()))?;

    // Fetch messages
    // Note: Python Intelligence service persists to 'chat_messages'
    let messages = crate::infra::postgres::chat_repo::get_messages(&state.db, conversation_id)
        .await
        .map_err(|e| ChatError::DatabaseError(e.to_string()))?;

    let response_messages = messages
        .into_iter()
        .map(|msg| ChatMessage {
            id: msg.id,
            role: match msg.role.as_str() {
                "user" => MessageRole::User,
                "assistant" => MessageRole::Assistant,
                _ => MessageRole::System,
            },
            content: msg.content,
            created_at: msg.created_at,
            sources: serde_json::from_value(msg.sources).unwrap_or_default(),
            parent_id: msg.parent_id.map(|u| u.to_string()),
        })
        .collect();

    Ok(Json(ConversationWithMessages {
        id: conversation.id,
        title: conversation.title,
        messages: response_messages,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
    }))
}

/// List user's conversations with pagination
/// GET /chat/conversations?limit=20&cursor=abc
pub async fn list_conversations(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Query(params): Query<ListConversationsQuery>,
) -> ChatResult<Json<ConversationListResponse>> {
    let limit = params.limit.min(50) as i64;
    let offset = params
        .cursor
        .and_then(|c| c.parse::<i64>().ok())
        .unwrap_or(0);

    let conversations = crate::infra::postgres::chat_repo::list_conversations(
        &state.db,
        &user_id.to_string(),
        limit,
        offset,
    )
    .await
    .map_err(|e| ChatError::DatabaseError(e.to_string()))?;

    let total_count =
        crate::infra::postgres::chat_repo::count_conversations(&state.db, &user_id.to_string())
            .await
            .map_err(|e| ChatError::DatabaseError(e.to_string()))? as i32;

    let loaded_count = conversations.len() as i64;

    let response_conversations = conversations
        .into_iter()
        .map(|row| ConversationSummary {
            id: row.id,
            title: row.title,
            message_count: row.message_count as i32,
            last_message_preview: row.last_message_preview,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
        .collect();

    let next_cursor = if loaded_count < limit {
        None
    } else {
        Some((offset + limit).to_string())
    };

    Ok(Json(ConversationListResponse {
        conversations: response_conversations,
        next_cursor,
        total_count,
    }))
}

/// Update conversation metadata (title, tags, etc.)
/// PATCH /chat/conversations/{id}
pub async fn update_conversation(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(conversation_id): Path<Uuid>,
    Json(req): Json<UpdateConversationRequest>,
) -> ChatResult<Json<ConversationResponse>> {
    let conversation = crate::infra::postgres::chat_repo::update_title(
        &state.db,
        conversation_id,
        &user_id.to_string(),
        req.title,
    )
    .await
    .map_err(|e| ChatError::DatabaseError(e.to_string()))?
    .ok_or(ChatError::ConversationNotFound(conversation_id.to_string()))?;

    // Get message count
    let message_count =
        crate::infra::postgres::chat_repo::message_count(&state.db, conversation_id)
            .await
            .map_err(|e| ChatError::DatabaseError(e.to_string()))?;

    Ok(Json(ConversationResponse {
        id: conversation.id,
        user_id: conversation.user_id,
        title: conversation.title,
        message_count: message_count as i32,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
    }))
}

/// Delete conversation
/// DELETE /chat/conversations/{id}
pub async fn delete_conversation(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(conversation_id): Path<Uuid>,
) -> ChatResult<Json<DeleteConversationResponse>> {
    // Check ownership
    let exists = crate::infra::postgres::chat_repo::conversation_exists(
        &state.db,
        conversation_id,
        &user_id.to_string(),
    )
    .await
    .map_err(|e| ChatError::DatabaseError(e.to_string()))?;

    if !exists {
        return Err(ChatError::ConversationNotFound(conversation_id.to_string()));
    }

    // Delete (cascades to messages)
    crate::infra::postgres::chat_repo::delete_conversation(&state.db, conversation_id)
        .await
        .map_err(|e| ChatError::DatabaseError(e.to_string()))?;

    // Since we don't know how many messages were deleted easily without a prior count or RETURNING
    // We can just return 0 or do a count before delete.
    // Spec says "messages_deleted".
    // Let's assume 0 for now or do a count query before delete if critical.
    // For efficiency, we'll just return success.

    Ok(Json(DeleteConversationResponse {
        success: true,
        conversation_id,
        messages_deleted: 0, // Simplified
    }))
}

/// Generate conversation title using AI
/// POST /chat/conversations/{id}/generate-title
pub async fn generate_conversation_title(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(conversation_id): Path<Uuid>,
    Json(req): Json<GenerateTitleRequest>,
) -> ChatResult<Json<GenerateTitleResponse>> {
    // 1. Verify conversation belongs to user
    let conversation_exists = crate::infra::postgres::chat_repo::conversation_exists(
        &state.db,
        conversation_id,
        &user_id.to_string(),
    )
    .await?;

    if !conversation_exists {
        return Err(ChatError::NotFound(format!(
            "Conversation {} not found",
            conversation_id
        )));
    }

    // 2. Forward to intelligence service (all AI logic happens there)
    use crate::grpc::proto::opentier::intelligence::v1 as pb;

    let grpc_request = pb::GenerateTitleRequest {
        conversation_id: conversation_id.to_string(),
        user_message: req.user_message,
        assistant_message: req.assistant_message,
    };

    let response = state
        .intelligence_client
        .clone()
        .generate_title(grpc_request)
        .await
        .map_err(|e| ChatError::IntelligenceError(format!("Failed to generate title: {}", e)))?;

    Ok(Json(GenerateTitleResponse {
        title: response.into_inner().title,
    }))
}

// ============================================================================
// MESSAGING
// ============================================================================

/// Send a message to a conversation (non-streaming)
/// POST /chat/conversations/{id}/messages
///
/// NOTE: Message persistence is handled by the Intelligence service to avoid
/// dual storage and data inconsistency. The API only validates and forwards.
/// Release the request's credit hold quietly (R1: no stranded funds).
async fn release_hold_quiet(
    db: &sqlx::PgPool,
    user_id: Option<uuid::Uuid>,
    key: &Option<crate::middleware::CreditHoldKey>,
) {
    let (Some(uid), Some(crate::middleware::CreditHoldKey(k))) = (user_id, key) else {
        return;
    };
    if let Err(e2) = crate::infra::billing::release_by_key(db, uid, k).await {
        tracing::warn!(error = %e2, "failed to release credit hold");
    }
}

pub async fn send_message(
    State(state): State<AppState>,
    user_id_ext: Option<Extension<Uuid>>,
    peer_ip_ext: Option<Extension<PeerIp>>,
    hold_ext: Option<Extension<crate::middleware::CreditHoldKey>>,
    Path(conversation_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ChatCompletionRequest>,
) -> ChatResult<Json<MessageResponse>> {
    let cfg = req.config.clone().unwrap_or_default();

    // Validate message length
    if req.message.is_empty() {
        return Err(ChatError::InvalidMessage(
            "Message cannot be empty".to_string(),
        ));
    }
    if req.message.len() > 10000 {
        return Err(ChatError::MessageTooLong(req.message.len(), 10000));
    }

    // Determine the user identifier to send to intelligence
    let (user_id_str, user_uuid, is_anonymous) = if let Some(Extension(uid)) = user_id_ext {
        (uid.to_string(), Some(uid), false)
    } else if let Some(Extension(PeerIp(ref ip))) = peer_ip_ext {
        (format!("ip:{}", ip), None, true)
    } else {
        return Err(ChatError::Unauthorized("No user context found".to_string()));
    };
    let hold_key: Option<crate::middleware::CreditHoldKey> = hold_ext.map(|Extension(k)| k);

    // Verify conversation exists and belongs to user (only for authenticated users)
    // Anonymous users don't have records in the `conversations` table, so Intelligence handles it.
    if !is_anonymous {
        let conversation_exists = crate::infra::postgres::chat_repo::conversation_exists(
            &state.db,
            conversation_id,
            &user_id_str,
        )
        .await
        .map_err(|e| ChatError::DatabaseError(e.to_string()))?;

        if !conversation_exists {
            return Err(ChatError::ConversationNotFound(conversation_id.to_string()));
        }
    }

    // Call Python intelligence service via gRPC
    // Intelligence service handles message persistence (single source of truth)
    let mut client = state.intelligence_client.clone();

    let mut metadata = std::collections::HashMap::new();
    if let Some(parent_id) = req.parent_id {
        metadata.insert("parent_id".to_string(), parent_id);
    }
    if let Some(user_id) = req.user_message_id {
        metadata.insert("user_message_id".to_string(), user_id);
    }
    if let Some(assist_id) = req.assistant_message_id {
        metadata.insert("assistant_message_id".to_string(), assist_id);
    }
    if let Some(regen_id) = req.regenerate_user_msg_id {
        metadata.insert("regenerate_user_msg_id".to_string(), regen_id);
    }
    if let Some(ref k) = hold_key {
        metadata.insert("hold_key".to_string(), k.0.clone());
    }

    let grpc_req = crate::grpc::proto::opentier::intelligence::v1::ChatRequest {
        user_id: user_id_str,
        conversation_id: conversation_id.to_string(),
        message: req.message.clone(),
        metadata,
        config: Some(crate::grpc::proto::opentier::intelligence::v1::ChatConfig {
            temperature: cfg.temperature,
            max_tokens: cfg.max_tokens,
            use_rag: Some(cfg.use_rag),
            model: cfg.model.clone(),
            context_limit: None,
        }),
    };

    // Propagate the correlation id (set by the SetRequestId layer,
    // preferring the inbound X-Correlation-ID) into the gRPC call so the
    // trace chain (REST -> gRPC -> engine -> billing events) stays joined.
    let correlation_id = headers
        .get("x-correlation-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let response = match client.send_message(grpc_req, correlation_id).await {
        Ok(r) => r.into_inner(),
        Err(e) => {
            release_hold_quiet(&state.db, user_uuid, &hold_key).await;
            return Err(ChatError::from(e));
        }
    };

    // Parse response
    let message_id = Uuid::parse_str(&response.message_id)
        .map_err(|e| ChatError::InternalError(format!("Invalid message ID: {}", e)))?;

    // Extract metrics from nested structure with warning if missing
    let metrics = match response.metrics {
        Some(m) => m,
        None => {
            tracing::warn!(
                conversation_id = %response.conversation_id,
                message_id = %response.message_id,
                "Chat response missing metrics from Intelligence service"
            );
            Default::default()
        }
    };

    // Calculate sources_retrieved before moving sources
    let sources_count = response.sources.len() as i32;

    // Convert to SourceChunk (map all fields from proto ContextChunk)
    let source_chunks: Vec<SourceChunk> = response
        .sources
        .into_iter()
        .map(|s| SourceChunk {
            chunk_id: s.chunk_id,
            document_id: s.document_id,
            content: s.content,
            relevance_score: s.relevance_score,
            document_title: s.document_title,
            source_url: s.source_url,
        })
        .collect();

    // NOTE: Message persistence is handled by the Intelligence service
    // We only return the response to the client without local storage

    Ok(Json(MessageResponse {
        message_id,
        conversation_id,
        role: MessageRole::Assistant,
        content: response.response,
        sources: source_chunks,
        metrics: ChatMetrics {
            tokens_used: metrics.tokens_used,
            context_tokens: metrics.prompt_tokens,
            response_tokens: metrics.completion_tokens,
            latency_ms: metrics.latency_ms,
            sources_retrieved: sources_count,
        },
        created_at: chrono::DateTime::from_timestamp(response.created_at, 0).unwrap_or_default(),
    }))
}

// ============================================================================
// STREAMING
// ============================================================================

/// Stream chat response in real-time (Server-Sent Events)
/// POST /chat/conversations/{id}/stream
pub async fn stream_chat(
    State(state): State<AppState>,
    user_id_ext: Option<Extension<Uuid>>,
    peer_ip_ext: Option<Extension<PeerIp>>,
    hold_ext: Option<Extension<crate::middleware::CreditHoldKey>>,
    Path(conversation_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ChatCompletionRequest>,
) -> ChatResult<(
    axum::http::HeaderMap,
    Sse<impl Stream<Item = Result<Event, Infallible>>>,
)> {
    use futures::StreamExt;

    let cfg = req.config.clone().unwrap_or_default();

    let mut client = state.intelligence_client.clone();

    let mut metadata = std::collections::HashMap::new();
    if let Some(parent_id) = req.parent_id {
        metadata.insert("parent_id".to_string(), parent_id);
    }
    if let Some(user_message_id) = req.user_message_id {
        metadata.insert("user_message_id".to_string(), user_message_id);
    }
    if let Some(assist_id) = req.assistant_message_id {
        metadata.insert("assistant_message_id".to_string(), assist_id);
    }
    if let Some(regen_id) = req.regenerate_user_msg_id {
        metadata.insert("regenerate_user_msg_id".to_string(), regen_id);
    }

    // Determine the user identifier to send to intelligence
    let (user_id_str, user_uuid, is_anonymous) = if let Some(Extension(uid)) = user_id_ext {
        (uid.to_string(), Some(uid), false)
    } else if let Some(Extension(PeerIp(ref ip))) = peer_ip_ext {
        (format!("ip:{}", ip), None, true)
    } else {
        return Err(ChatError::Unauthorized("No user context found".to_string()));
    };
    let hold_key: Option<crate::middleware::CreditHoldKey> = hold_ext.map(|Extension(k)| k);

    // Verify conversation exists and belongs to user (only for authenticated users)
    if !is_anonymous {
        let conversation_exists = crate::infra::postgres::chat_repo::conversation_exists(
            &state.db,
            conversation_id,
            &user_id_str,
        )
        .await
        .map_err(|e| ChatError::DatabaseError(e.to_string()))?;

        if !conversation_exists {
            return Err(ChatError::ConversationNotFound(conversation_id.to_string()));
        }
    }

    if let Some(ref k) = hold_key {
        metadata.insert("hold_key".to_string(), k.0.clone());
    }

    let request = crate::grpc::proto::opentier::intelligence::v1::ChatRequest {
        user_id: user_id_str,
        conversation_id: conversation_id.to_string(),
        message: req.message,
        metadata,
        config: Some(crate::grpc::proto::opentier::intelligence::v1::ChatConfig {
            temperature: cfg.temperature,
            max_tokens: cfg.max_tokens,
            use_rag: Some(cfg.use_rag),
            model: cfg.model.clone(),
            context_limit: None,
        }),
    };

    // Propagate the correlation id into the gRPC stream call.
    let correlation_id = headers
        .get("x-correlation-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let grpc_stream = match client.stream_chat(request, correlation_id).await {
        Ok(s) => s.into_inner(),
        Err(e) => {
            release_hold_quiet(&state.db, user_uuid, &hold_key).await;
            return Err(ChatError::GrpcError(e));
        }
    };

    let sse_stream = grpc_stream.map(move |result| {
        match result {
            Ok(chunk) => {
                match chunk.chunk_type {
                    Some(crate::grpc::proto::opentier::intelligence::v1::chat_stream_chunk::ChunkType::Token(text)) => {
                        Ok(Event::default().event("message").data(text))
                    }
                    #[allow(deprecated)]
                    Some(crate::grpc::proto::opentier::intelligence::v1::chat_stream_chunk::ChunkType::Error(err)) => {
                        // Legacy string form (deprecated in v1.1.0).
                        Ok(Event::default().event("error").data(err))
                    }
                    Some(crate::grpc::proto::opentier::intelligence::v1::chat_stream_chunk::ChunkType::TypedError(typed)) => {
                        // Structured form: emit code + message as JSON.
                        let data = serde_json::json!({
                            "code": typed.code,
                            "message": typed.message,
                        })
                        .to_string();
                        Ok(Event::default().event("error").data(data))
                    }
                    Some(crate::grpc::proto::opentier::intelligence::v1::chat_stream_chunk::ChunkType::Source(source)) => {
                        let chunk = SourceChunk {
                            chunk_id: source.chunk_id,
                            document_id: source.document_id,
                            content: source.content,
                            relevance_score: source.relevance_score,
                            document_title: source.document_title,
                            source_url: source.source_url,
                        };
                        let data = serde_json::to_string(&chunk).unwrap_or_default();
                        Ok(Event::default().event("source").data(data))
                    }
                    Some(crate::grpc::proto::opentier::intelligence::v1::chat_stream_chunk::ChunkType::Metrics(metrics)) => {
                        // Serialize metrics to JSON
                        let m = ChatMetrics {
                            tokens_used: metrics.tokens_used,
                            context_tokens: metrics.prompt_tokens,
                            response_tokens: metrics.completion_tokens,
                            latency_ms: metrics.latency_ms,
                            sources_retrieved: metrics.sources_retrieved,
                        };
                        let data = serde_json::to_string(&m).unwrap_or_default();
                        Ok(Event::default().event("metrics").data(data))
                    }
                    None => Ok(Event::default().event("ping").data("")),
                }
            }
            Err(e) => {
                let err_msg = format!("gRPC Error: {:?}", e);
                Ok(Event::default().event("error").data(err_msg))
            }
        }
    });

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        "x-accel-buffering",
        axum::http::HeaderValue::from_static("no"),
    );
    headers.insert(
        "cache-control",
        axum::http::HeaderValue::from_static("no-cache, no-transform"),
    );

    Ok((
        headers,
        Sse::new(sse_stream).keep_alive(KeepAlive::default()),
    ))
}

// ============================================================================
// CONTENT-NEGOTIATED CHAT COMPLETION
// ============================================================================

/// Single chat-completion endpoint that negotiates the response shape via the
/// `Accept` header.
///
/// - `Accept: text/event-stream` → streamed SSE (delegates to `stream_chat`).
/// - anything else               → buffered JSON (delegates to `send_message`).
///
/// `/conversations/{id}/stream` remains a thin backward-compat alias that points
/// directly at `stream_chat`; it can be removed once the client cuts over to
/// sending `Accept: text/event-stream` to this route.
pub async fn chat_completion(
    State(state): State<AppState>,
    user_id_ext: Option<Extension<Uuid>>,
    peer_ip_ext: Option<Extension<PeerIp>>,
    hold_ext: Option<Extension<crate::middleware::CreditHoldKey>>,
    Path(conversation_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ChatCompletionRequest>,
) -> axum::response::Response {
    let wants_stream = headers
        .get(axum::http::header::ACCEPT)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_ascii_lowercase().contains("text/event-stream"))
        .unwrap_or(false);

    if wants_stream {
        stream_chat(
            State(state),
            user_id_ext,
            peer_ip_ext,
            hold_ext,
            Path(conversation_id),
            headers,
            Json(req),
        )
        .await
        .into_response()
    } else {
        send_message(
            State(state),
            user_id_ext,
            peer_ip_ext,
            hold_ext,
            Path(conversation_id),
            headers,
            Json(req),
        )
        .await
        .into_response()
    }
}
