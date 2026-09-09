import { apiClient } from '@/lib/api-client';
import {
    ChangePasswordRequest,
    SessionListResponse,
    SessionListResponseSchema,
    UpdateProfileRequest,
    UpdateRoleRequest,
    UserListResponse,
    UserListResponseSchema,
    UserResponse,
    UserResponseSchema,
} from '@/lib/api-types';

// ============================================================================
// SELF-SERVICE USER API
// ============================================================================

export async function fetchCurrentUserApi(): Promise<UserResponse> {
    const data = await apiClient<unknown>('/users/me');
    const parsed = UserResponseSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error('Invalid user data received');
    }
    return parsed.data;
}

export async function updateProfileApi(payload: UpdateProfileRequest): Promise<UserResponse> {
    const data = await apiClient<unknown>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });

    const parsed = UserResponseSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error('Invalid updated user data received');
    }

    return parsed.data;
}

export async function changePasswordApi(payload: ChangePasswordRequest): Promise<void> {
    await apiClient('/users/me/password', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteAccountApi(): Promise<void> {
    await apiClient('/users/me', { method: 'DELETE' });
}

export async function listSessionsApi(): Promise<SessionListResponse> {
    const data = await apiClient<unknown>('/users/me/sessions');
    const parsed = SessionListResponseSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error('Invalid session data received');
    }
    return parsed.data;
}

export async function revokeSessionApi(sessionId: string): Promise<void> {
    await apiClient(`/users/me/sessions/${sessionId}`, { method: 'DELETE' });
}

// ============================================================================
// ADMINISTRATIVE USER MANAGEMENT API
// ============================================================================

export async function fetchAdminUsersApi(params: {
    search?: string;
    limit?: number;
    offset?: number;
}): Promise<UserListResponse> {
    const { search = '', limit = 20, offset = 0 } = params;
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    queryParams.append('limit', String(limit));
    queryParams.append('offset', String(offset));

    const data = await apiClient<unknown>(`/users?${queryParams.toString()}`);
    const parsed = UserListResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid user list data');
    return parsed.data;
}

export async function updateUserRoleApi(userId: string, role: string): Promise<void> {
    const body: UpdateRoleRequest = { role };
    await apiClient(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export async function toggleUserDisabledApi(userId: string, disabled: boolean): Promise<void> {
    await apiClient(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_disabled: disabled, disabled }),
    });
}

export async function deleteUserApi(userId: string): Promise<void> {
    await apiClient(`/users/${userId}`, { method: 'DELETE' });
}
