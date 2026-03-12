import { z } from "zod";

// ============================================================================
// RE-EXPORTS FROM TYPES FOLDER (TypeScript Interfaces)
// ============================================================================
// For component consumption, use types from the types/ folder
export type {
    // Auth
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    SignUpResponse,
    // Contact
    ContactRequest,
    ContactResponse,
    // Health
    HealthResponse,
    DashboardHealth,
    // User
    UserRole,
    UserResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
    // Session
    Session,
    SessionListResponse,
    DashboardSession,
    // Resources
    ResourceConfig,
    AddResourceRequest,
    ResourceItemResponse,
    ListResourcesResponse,
    DeleteResponse,
    DashboardResource,
    DashboardResourceConfig,
    DashboardAddResourceRequest,
    ResourceType,
    ResourceStatus,
    // Admin
    DataPoint,
    AdminStats,
    UserAdminView,
    UserListResponse,
    UpdateRoleRequest,
    DashboardStats,
    DashboardUser,
    // Submissions
    SubmitResourceRequest,
    SubmitResourceResponse,
    SubmissionItem,
    QueueListResponse,
    ReviewRequest,
    ReviewResponse,
    // Chat
    MessageRole,
    SourceChunk,
    ChatMessage,
    ConversationSummary,
    ConversationListResponse,
    CreateConversationRequest,
    ConversationWithMessages,
    ChatMetrics,
    MessageResponse,
    SendMessageRequest,
    ChatState,
} from "@/types";

// ============================================================================
// ZOD SCHEMAS FOR API VALIDATION
// ============================================================================

// CONTACT SCHEMAS
export const ContactRequestSchema = z.object({
    name: z.string().min(1),
    email: z.email(),
    subject: z.string().min(1),
    message: z.string().min(1),
});

export const ContactResponseSchema = z.object({
    message: z.string(),
});

// HEALTH SCHEMAS
export const HealthResponseSchema = z.object({
    status: z.string(),
    version: z.string(),
    uptime_seconds: z.number(),
});

// AUTH SCHEMAS
export const SignInRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(1, "Password is required"),
});

export const SignInResponseSchema = z.object({
    user_id: z.uuid(),
    email: z.email(),
    session_token: z.string(),
    expires_at: z.string(),
});

export const SignUpRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().optional(),
    username: z.string().optional(),
    contributor_opt_in: z.boolean().optional(),
});

export const SignUpResponseSchema = z.object({
    user_id: z.uuid(),
    email: z.email(),
    message: z.string(),
});

// USER SCHEMAS
export const UserRoleSchema = z.enum(["user", "admin", "contributor"]);

export const UserResponseSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    email_verified: z.boolean(),
    name: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    role: z.string(),
    created_at: z.string(),
});

export const UpdateProfileRequestSchema = z.object({
    name: z.string().optional(),
    username: z.string().optional(),
    avatar_url: z.string().optional(),
    contributor_opt_in: z.boolean().optional(),
});

export const ChangePasswordRequestSchema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
});

// SESSION SCHEMAS
export const SessionSchema = z.object({
    id: z.uuid(),
    user_id: z.uuid(),
    session_token: z.string(),
    expires_at: z.string(),
    ip_address: z.string().nullable().optional(),
    user_agent: z.string().nullable().optional(),
    created_at: z.string(),
});

export const SessionListResponseSchema = z.object({
    sessions: z.array(SessionSchema),
});

// CHAT SCHEMAS
export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);

export const SourceChunkSchema = z.object({
    chunk_id: z.string(),
    document_id: z.string(),
    content: z.string(),
    relevance_score: z.number(),
    document_title: z.string().optional(),
    source_url: z.string().optional(),
});

export const ChatMessageSchema = z.object({
    id: z.uuid(),
    role: MessageRoleSchema,
    content: z.string(),
    sources: z.array(SourceChunkSchema).optional().default([]),
    created_at: z.number(),
    parent_id: z.string().optional(),
});

export const ConversationSummarySchema = z.object({
    id: z.uuid(),
    title: z.string().nullable().optional(),
    message_count: z.number(),
    last_message_preview: z.string().nullable().optional(),
    created_at: z.number(),
    updated_at: z.number(),
});

export const ConversationListResponseSchema = z.object({
    conversations: z.array(ConversationSummarySchema),
    next_cursor: z.string().nullable().optional(),
    total_count: z.number(),
});

export const CreateConversationRequestSchema = z.object({
    title: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export const SendMessageRequestSchema = z.object({
    message: z.string(),
    config: z.object({
        temperature: z.number().optional(),
        max_tokens: z.number().optional(),
        use_rag: z.boolean().optional(),
        model: z.string().optional(),
    }).optional(),
});

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
    metrics: ChatMetricsSchema.optional(),
    created_at: z.number(),
});

export const ConversationWithMessagesSchema = z.object({
    id: z.uuid(),
    title: z.string().nullable().optional(),
    messages: z.array(ChatMessageSchema),
    created_at: z.number(),
    updated_at: z.number(),
});

// ADMIN SCHEMAS
export const DataPointSchema = z.object({
    label: z.string(),
    value: z.number(),
});

export const AdminStatsSchema = z.object({
    total_users: z.number(),
    active_users_24h: z.number(),
    total_conversations: z.number(),
    total_messages: z.number(),
    user_growth: z.array(DataPointSchema),
    message_activity: z.array(DataPointSchema),
});

export const UserAdminViewSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    full_name: z.string().nullable().optional(),
    role: z.string(),
    is_verified: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    is_disabled: z.boolean().optional(),
    message_limit: z.number().optional(),
    messages_used: z.number().optional(),
});

export const UserListResponseSchema = z.object({
    users: z.array(UserAdminViewSchema),
    total_count: z.number(),
    limit: z.number(),
    offset: z.number(),
});

export const UpdateRoleRequestSchema = z.object({
    role: z.string(),
});

// RESOURCE SCHEMAS
export const ResourceConfigSchema = z.object({
    depth: z.number().optional(),
    chunk_size: z.number().optional(),
    chunk_overlap: z.number().optional(),
    auto_clean: z.boolean().optional(),
    generate_embeddings: z.boolean().optional(),
    follow_links: z.boolean().optional(),
});

export const AddResourceRequestSchema = z.object({
    resource_type: z.string(),
    content: z.string(),
    title: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    config: ResourceConfigSchema.optional(),
    is_global: z.boolean().optional(),
});

export const ResourceItemResponseSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string().nullish(),
    status: z.string(),
    chunks_created: z.number(),
    created_at: z.number(),
    metadata: z.record(z.string(), z.string()).optional(),
    is_global: z.boolean(),
});

export const ListResourcesResponseSchema = z.object({
    items: z.array(ResourceItemResponseSchema),
    next_cursor: z.string().nullable().optional(),
    total: z.number(),
});

export const DeleteResponseSchema = z.object({
    status: z.string(),
    message: z.string(),
});

// SUBMISSIONS SCHEMAS
export const SubmitResourceRequestSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    resource_type: z.string().default("text"),
    metadata: z.record(z.string(), z.string()).optional(),
});

export const SubmitResourceResponseSchema = z.object({
    submission_id: z.string(),
    status: z.string(),
    message: z.string(),
    created_at: z.string(),
});

export const SubmissionItemSchema = z.object({
    id: z.string(),
    contributor_id: z.string(),
    contributor_email: z.string().nullable().optional(),
    contributor_name: z.string().nullable().optional(),
    title: z.string(),
    content: z.string(),
    resource_type: z.string(),
    metadata: z.any(),
    status: z.string(),
    admin_feedback: z.string().nullable().optional(),
    reviewed_by: z.string().nullable().optional(),
    reviewed_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
});

export const QueueListResponseSchema = z.object({
    items: z.array(SubmissionItemSchema),
    total: z.number(),
});

export const ReviewRequestSchema = z.object({
    action: z.enum(["approve", "reject"]),
    feedback: z.string().optional(),
});

export const ReviewResponseSchema = z.object({
    submission_id: z.string(),
    status: z.string(),
    message: z.string(),
    resource_id: z.string().nullable().optional(),
    job_id: z.string().nullable().optional(),
});

