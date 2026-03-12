
// ============================================================================
// CHAT TYPES
// ============================================================================

export type MessageRole = "user" | "assistant" | "system";
export type MessageRoles = MessageRole; // Backward compatibility

export interface SourceChunk {
    chunk_id: string;
    document_id: string;
    content: string;
    relevance_score: number;
    document_title?: string;
    source_url?: string;
}

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    sources?: SourceChunk[];
    created_at: number; // Unix timestamp in seconds
    parent_id?: string; // UUID of the parent message for branching
}

export interface ConversationSummary {
    id: string;
    title?: string | null;
    message_count: number;
    last_message_preview?: string | null;
    created_at: number;
    updated_at: number;
}

export interface ConversationListResponse {
    conversations: ConversationSummary[];
    next_cursor?: string | null;
    total_count: number;
}

export interface CreateConversationRequest {
    title?: string;
    metadata?: Record<string, unknown>;
}

export interface ConversationWithMessages {
    id: string;
    title?: string | null;
    messages: ChatMessage[];
    created_at: number;
    updated_at: number;
}

export interface ChatMetrics {
    tokens_used: number;
    context_tokens: number;
    response_tokens: number;
    latency_ms: number;
    sources_retrieved: number;
}

export interface MessageResponse {
    message_id: string;
    conversation_id: string;
    role: MessageRole;
    content: string;
    sources: SourceChunk[];
    metrics?: ChatMetrics;
    created_at: number;
}

export interface SendMessageRequest {
    message: string;
    config?: {
        temperature?: number;
        max_tokens?: number;
        use_rag?: boolean;
        model?: string;
    };
    parent_id?: string;
    user_message_id?: string;
    assistant_message_id?: string;
    regenerate_user_msg_id?: string;
}

export interface ChatState {
    conversations: ConversationSummary[];
    activeConversationId: string | null;
    messages: Record<string, ChatMessage[]>;
    activeMessageId: Record<string, string | null>;
    nextCursor: string | null;
    freeMessageCount: number;
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;
    isTyping: boolean;
    error: string | null;
}