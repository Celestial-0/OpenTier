// ============================================================================
// AUTH TYPES
// ============================================================================

export interface SignInRequest {
    email: string;
    password: string;
}

export interface SignUpRequest {
    email: string;
    password: string;
    name?: string;
    username?: string;
    contributor_opt_in?: boolean;
}

export interface SignInResponse {
    user_id: string;
    email: string;
    session_token: string;
    expires_at: string; // ISO String
}

export interface SignUpResponse {
    user_id: string;
    email: string;
    session_token: string;
    expires_at: string; // ISO String
    message: string;
}
