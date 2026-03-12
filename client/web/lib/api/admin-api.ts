import { apiClient } from '@/lib/api-client';
import {
    AddResourceRequest,
    AdminStats,
    AdminStatsSchema,
    ListResourcesResponse,
    ListResourcesResponseSchema,
    ResourceItemResponse,
    UpdateRoleRequest,
    UserListResponse,
    UserListResponseSchema,
} from '@/lib/api-types';
import { buildApiHeaders, resolveApiUrl } from '@/lib/api/base';

export async function fetchAdminStatsApi(): Promise<AdminStats> {
    const data = await apiClient<unknown>('/admin/stats');
    const parsed = AdminStatsSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid stats data');
    return parsed.data;
}

export async function fetchAdminUsersApi(params: { search?: string; limit?: number; offset?: number }): Promise<UserListResponse> {
    const { search = '', limit = 20, offset = 0 } = params;
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    queryParams.append('limit', String(limit));
    queryParams.append('offset', String(offset));

    const data = await apiClient<unknown>(`/admin/users?${queryParams.toString()}`);
    const parsed = UserListResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid user list data');
    return parsed.data;
}

export async function fetchResourcesApi(params: { resource_type?: string; status?: string; limit?: number; cursor?: string }): Promise<ListResourcesResponse> {
    const { resource_type, status, limit = 20, cursor } = params;
    const queryParams = new URLSearchParams();
    if (resource_type) queryParams.append('resource_type', resource_type);
    if (status) queryParams.append('status', status);
    queryParams.append('limit', String(limit));
    if (cursor) queryParams.append('cursor', cursor);

    const data = await apiClient<unknown>(`/resources?${queryParams.toString()}`);
    const parsed = ListResourcesResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid resources data');
    return parsed.data;
}

export async function updateUserRoleApi(userId: string, role: string): Promise<void> {
    const body: UpdateRoleRequest = { role };
    await apiClient(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export async function updateUserLimitApi(userId: string, message_limit: number): Promise<void> {
    await apiClient(`/admin/users/${userId}/quota/limit`, {
        method: 'PATCH',
        body: JSON.stringify({ message_limit }),
    });
}

export async function toggleUserDisabledApi(userId: string, disabled: boolean): Promise<void> {
    await apiClient(`/admin/users/${userId}/disable`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled }),
    });
}

export async function deleteUserApi(userId: string): Promise<void> {
    await apiClient(`/admin/users/${userId}`, { method: 'DELETE' });
}

export async function addResourceApi(data: AddResourceRequest): Promise<{ resource_id?: string; job_id?: string; status?: string }> {
    return apiClient('/resources', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function deleteResourceApi(resourceId: string): Promise<void> {
    await apiClient(`/resources/${resourceId}`, { method: 'DELETE' });
}

export async function getResourceStatusApi(resourceId: string, jobId?: string): Promise<ResourceItemResponse & { progress?: number; error?: string }> {
    const qs = jobId ? `?job_id=${encodeURIComponent(jobId)}` : '';
    const response = await fetch(resolveApiUrl(`/resources/${resourceId}${qs}`), {
        headers: buildApiHeaders(undefined, false),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch resource status (${response.status})`);
    }

    return response.json();
}
