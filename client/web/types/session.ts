// ============================================================================
// SESSION TYPES
// ============================================================================

export interface Session {
    id: string;
    user_id: string;
    session_token: string;
    expires_at: string;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: string;
}

export interface SessionListResponse {
    sessions: Session[];
}
