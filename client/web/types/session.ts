// ============================================================================
// SESSION TYPES
// ============================================================================

export interface Session {
    id: string;
    user_id: string;
    session_token?: string;
    expires_at: string;
    ip_address?: string | null;
    user_agent?: string | null;
    device_name?: string | null;
    device_type?: string | null;
    is_current?: boolean;
    created_at: string;
}

export interface SessionListResponse {
    sessions: Session[];
}
