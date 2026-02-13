
export type MessageRoles = "user" | "assistant" | "system";

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
    role: MessageRoles;
    content: string;
    sources?: SourceChunk[];
    created_at: number; // Unix timestamp in seconds
}

export interface ConversationSummary {
    id: string;
    title?: string | null;
    message_count: number;
    last_message_preview?: string | null;
    created_at: number;
    updated_at: number;
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
    role: MessageRoles;
    content: string;
    sources: SourceChunk[];
    metrics?: ChatMetrics;
    created_at: number;
}

export interface CreateConversationRequest {
    title?: string;
    metadata?: Record<string, any>;
}

export interface SendMessageRequest {
    message: string;
    config?: {
        temperature?: number;
        max_tokens?: number;
        use_rag?: boolean;
        model?: string;
    };
}

export interface ChatState {
    conversations: ConversationSummary[];
    activeConversationId: string | null;
    messages: Record<string, ChatMessage[]>;
    nextCursor: string | null;
    freeMessageCount: number;
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;
    isTyping: boolean;
    error: string | null;
}