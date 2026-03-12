// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = "user" | "admin" | "contributor";

export interface UserResponse {
    id: string;
    email: string;
    email_verified: boolean;
    name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    role: string;
    created_at: string;
}

export interface UpdateProfileRequest {
    name?: string;
    username?: string;
    avatar_url?: string;
    contributor_opt_in?: boolean;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
}
