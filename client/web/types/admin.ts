// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface DataPoint {
    label: string;
    value: number;
}

export interface AdminStats {
    total_users: number;
    active_users_24h: number;
    total_conversations: number;
    total_messages: number;
    user_growth: DataPoint[];
    message_activity: DataPoint[];
}

export interface UserAdminView {
    id: string;
    email: string;
    full_name?: string | null;
    role: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    is_disabled?: boolean;
    message_limit?: number;
    messages_used?: number;
}

export interface UserListResponse {
    users: UserAdminView[];
    total_count: number;
    limit: number;
    offset: number;
}

export interface UpdateRoleRequest {
    role: string;
}
