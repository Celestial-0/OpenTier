import { z } from "zod";

// ============================================================================
// AUTH TYPES
// ============================================================================

export const SignInRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(1, "Password is required"),
});

export type SignInRequest = z.infer<typeof SignInRequestSchema>;

export const SignInResponseSchema = z.object({
    user_id: z.uuid(),
    email: z.email(),
    session_token: z.string(),
    expires_at: z.string(), // ISO String
});

export type SignInResponse = z.infer<typeof SignInResponseSchema>;

export const SignUpRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(8, "Password must be at least 8 characters"), // Assuming server constraint or best practice
    name: z.string().optional(),
    username: z.string().optional(),
});

export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

export const SignUpResponseSchema = z.object({
    user_id: z.uuid(),
    email: z.email(),
    message: z.string(),
});

export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;

// ============================================================================
// USER TYPES
// ============================================================================

export const UserRoleSchema = z.enum(["user", "admin", "superadmin"]); // Adapting generic Role to likely values based on common patterns, adjust if specific enum exists in rust types

export const UserResponseSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    email_verified: z.boolean(),
    name: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    role: z.string(), // Keeping loose for now or match Rust Role enum exactly if I revisit
    created_at: z.string(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const UpdateProfileRequestSchema = z.object({
    name: z.string().optional(),
    username: z.string().optional(),
    avatar_url: z.string().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const ChangePasswordRequestSchema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

// ============================================================================
// SESSION TYPES
// ============================================================================

export const SessionSchema = z.object({
    id: z.uuid(),
    user_id: z.uuid(),
    session_token: z.string(),
    expires_at: z.string(),
    ip_address: z.string().nullable().optional(),
    user_agent: z.string().nullable().optional(),
    created_at: z.string(),
});

export type Session = z.infer<typeof SessionSchema>;

export const SessionListResponseSchema = z.object({
    sessions: z.array(SessionSchema),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

// ============================================================================
// CHAT TYPES
// ============================================================================

export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const SourceChunkSchema = z.object({
    chunk_id: z.string(),
    document_id: z.string(),
    content: z.string(),
    relevance_score: z.number(),
    document_title: z.string().optional(),
    source_url: z.string().optional(),
});
export type SourceChunk = z.infer<typeof SourceChunkSchema>;

export const ChatMessageSchema = z.object({
    id: z.uuid(),
    role: MessageRoleSchema,
    content: z.string(),
    sources: z.array(SourceChunkSchema).optional().default([]),
    created_at: z.number(), // Unix timestamp (i64 in rust, usually number in JS if not too large, but i64 can overflow. Checking Rust: it's i64. JS limits to 2^53. If timestamp is seconds, it's fine. If micros, might be issue. Usually seconds for created_at). 
    // Rust `created_at: i64` usually implies seconds or millis. If millis, 2^53 covers it easily.
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ConversationSummarySchema = z.object({
    id: z.uuid(),
    title: z.string().nullable().optional(),
    message_count: z.number(),
    last_message_preview: z.string().nullable().optional(),
    created_at: z.number(),
    updated_at: z.number(),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const ConversationListResponseSchema = z.object({
    conversations: z.array(ConversationSummarySchema),
    next_cursor: z.string().nullable().optional(),
    total_count: z.number(),
});
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>;

export const CreateConversationRequestSchema = z.object({
    title: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateConversationRequest = z.infer<typeof CreateConversationRequestSchema>;

export const SendMessageRequestSchema = z.object({
    message: z.string(),
    config: z.object({
        temperature: z.number().optional(),
        max_tokens: z.number().optional(),
        use_rag: z.boolean().optional(),
        model: z.string().optional(),
    }).optional(),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const ChatMetricsSchema = z.object({
    tokens_used: z.number(),
    context_tokens: z.number(),
    response_tokens: z.number(),
    latency_ms: z.number(),
    sources_retrieved: z.number(),
});

export const MessageResponseSchema = z.object({
    message_id: z.uuid(),
    conversation_id: z.uuid(),
    role: MessageRoleSchema,
    content: z.string(),
    sources: z.array(SourceChunkSchema),
    metrics: ChatMetricsSchema.optional(), // Making optional in case server doesn't always send
    created_at: z.number(),
});
export type MessageResponse = z.infer<typeof MessageResponseSchema>;

export const ConversationWithMessagesSchema = z.object({
    id: z.uuid(),
    title: z.string().nullable().optional(),
    messages: z.array(ChatMessageSchema),
    created_at: z.number(),
    updated_at: z.number(),
});
export type ConversationWithMessages = z.infer<typeof ConversationWithMessagesSchema>;

