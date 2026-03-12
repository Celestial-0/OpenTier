import { apiClient } from '@/lib/api-client';
import {
    ChangePasswordRequest,
    SessionListResponse,
    SessionListResponseSchema,
    UpdateProfileRequest,
    UserResponse,
    UserResponseSchema,
} from '@/lib/api-types';

export async function fetchCurrentUserApi(): Promise<UserResponse> {
    const data = await apiClient<unknown>('/user/me');
    const parsed = UserResponseSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error('Invalid user data received');
    }
    return parsed.data;
}

export async function updateProfileApi(payload: UpdateProfileRequest): Promise<UserResponse> {
    const data = await apiClient<unknown>('/user/update-profile', {
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
    await apiClient('/user/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function deleteAccountApi(): Promise<void> {
    await apiClient('/user/delete-account', { method: 'DELETE' });
}

export async function listSessionsApi(): Promise<SessionListResponse> {
    const data = await apiClient<unknown>('/user/list-sessions');
    const parsed = SessionListResponseSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error('Invalid session data received');
    }
    return parsed.data;
}

export async function revokeSessionApi(sessionId: string): Promise<void> {
    await apiClient(`/user/revoke-session/${sessionId}`, { method: 'DELETE' });
}
