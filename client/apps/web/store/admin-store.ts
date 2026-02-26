import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    AdminStats,
    AdminStatsSchema,
    UserAdminView,
    UserListResponse,
    UserListResponseSchema,
    ResourceItemResponse,
    ListResourcesResponse,
    ListResourcesResponseSchema,
    AddResourceRequest,
    UpdateRoleRequest,
} from '@/lib/api-types';
import { getAuthHeaders } from '@/lib/auth-utils';

/**
 * Admin Store
 * 
 * Manages admin-only state and operations including:
 * - System statistics
 * - User management
 * - Resource management
 */

interface UsersPagination {
    total: number;
    limit: number;
    offset: number;
}

interface ResourcesPagination {
    total: number;
    cursor: string | null;
}

interface AdminState {
    // Data
    stats: AdminStats | null;
    users: UserAdminView[];
    resources: ResourceItemResponse[];

    // Pagination
    usersPagination: UsersPagination;
    resourcesPagination: ResourcesPagination;

    // UI State
    isLoadingStats: boolean;
    isLoadingUsers: boolean;
    isLoadingResources: boolean;
    error: string | null;

    // Actions
    fetchStats: () => Promise<void>;
    fetchUsers: (params?: { search?: string; limit?: number; offset?: number }) => Promise<void>;
    fetchResources: (params?: { resource_type?: string; status?: string; limit?: number; cursor?: string }) => Promise<void>;
    updateUserRole: (userId: string, role: string) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    addResource: (data: AddResourceRequest) => Promise<void>;
    deleteResource: (resourceId: string) => Promise<void>;
    clearError: () => void;
    reset: () => void;
}

export const useAdminStore = create<AdminState>()(
    devtools(
        (set, get) => ({
            // Initial state
            stats: null,
            users: [],
            resources: [],
            usersPagination: { total: 0, limit: 20, offset: 0 },
            resourcesPagination: { total: 0, cursor: null },
            isLoadingStats: false,
            isLoadingUsers: false,
            isLoadingResources: false,
            error: null,

            // Fetch system statistics
            fetchStats: async () => {
                set({ isLoadingStats: true, error: null });
                try {
                    const headers = getAuthHeaders();
                    const res = await fetch('/api/admin/stats', {
                        headers: {
                            ...headers as Record<string, string>
                        }
                    });

                    if (!res.ok) {
                        console.warn('Failed to fetch admin stats:', res.status, res.statusText);
                        set({ stats: null, isLoadingStats: false });
                        return;
                    }

                    const data = await res.json();
                    const parsed = AdminStatsSchema.safeParse(data);

                    if (!parsed.success) {
                        console.error('Invalid stats data:', parsed.error);
                        set({ stats: null, isLoadingStats: false });
                        return;
                    }

                    set({ stats: parsed.data, isLoadingStats: false });
                } catch (err) {
                    console.error('Error fetching stats:', err);
                    set({ stats: null, error: (err as Error).message, isLoadingStats: false });
                }
            },

            // Fetch users with optional search and pagination
            fetchUsers: async (params = {}) => {
                set({ isLoadingUsers: true, error: null });
                try {
                    const { search = '', limit = 20, offset = 0 } = params;
                    const queryParams = new URLSearchParams();
                    if (search) queryParams.append('search', search);
                    queryParams.append('limit', limit.toString());
                    queryParams.append('offset', offset.toString());

                    const headers = getAuthHeaders();
                    const res = await fetch(`/api/admin/users?${queryParams.toString()}`, {
                        headers: {
                            ...headers as Record<string, string>
                        }
                    });

                    if (!res.ok) {
                        console.warn('Failed to fetch users:', res.status, res.statusText);
                        set({
                            users: [],
                            usersPagination: { total: 0, limit: 20, offset: 0 },
                            isLoadingUsers: false,
                        });
                        return;
                    }

                    const data = await res.json();
                    const parsed = UserListResponseSchema.safeParse(data);

                    if (!parsed.success) {
                        console.error('Invalid user list data:', parsed.error);
                        set({
                            users: [],
                            usersPagination: { total: 0, limit: 20, offset: 0 },
                            isLoadingUsers: false,
                        });
                        return;
                    }

                    set({
                        users: parsed.data.users,
                        usersPagination: {
                            total: parsed.data.total_count,
                            limit: parsed.data.limit,
                            offset: parsed.data.offset,
                        },
                        isLoadingUsers: false,
                    });
                } catch (err) {
                    console.error('Error fetching users:', err);
                    set({
                        users: [],
                        usersPagination: { total: 0, limit: 20, offset: 0 },
                        error: (err as Error).message,
                        isLoadingUsers: false
                    });
                }
            },

            // Fetch resources with optional filtering and pagination
            fetchResources: async (params = {}) => {
                set({ isLoadingResources: true, error: null });
                try {
                    const { resource_type, status, limit = 20, cursor } = params;
                    const queryParams = new URLSearchParams();
                    if (resource_type) queryParams.append('resource_type', resource_type);
                    if (status) queryParams.append('status', status);
                    queryParams.append('limit', limit.toString());
                    if (cursor) queryParams.append('cursor', cursor);

                    const headers = getAuthHeaders();
                    const res = await fetch(`/api/admin/resources?${queryParams.toString()}`, {
                        headers: {
                            ...headers as Record<string, string>
                        }
                    });

                    if (!res.ok) {
                        // If endpoint doesn't exist or returns error, set empty state
                        console.warn('Failed to fetch resources:', res.status, res.statusText);
                        set({
                            resources: [],
                            resourcesPagination: { total: 0, cursor: null },
                            isLoadingResources: false,
                        });
                        return;
                    }

                    const data = await res.json();
                    const parsed = ListResourcesResponseSchema.safeParse(data);

                    if (!parsed.success) {
                        console.error('Invalid resources data:', parsed.error);
                        // Set empty state instead of throwing
                        set({
                            resources: [],
                            resourcesPagination: { total: 0, cursor: null },
                            isLoadingResources: false,
                        });
                        return;
                    }

                    set({
                        resources: parsed.data.items,
                        resourcesPagination: {
                            total: parsed.data.total,
                            cursor: parsed.data.next_cursor || null,
                        },
                        isLoadingResources: false,
                    });
                } catch (err) {
                    console.error('Error fetching resources:', err);
                    set({
                        resources: [],
                        resourcesPagination: { total: 0, cursor: null },
                        error: (err as Error).message,
                        isLoadingResources: false
                    });
                }
            },

            // Update user role
            updateUserRole: async (userId: string, role: string) => {
                try {
                    const headers = getAuthHeaders();
                    const body: UpdateRoleRequest = { role };

                    const res = await fetch(`/api/admin/users/${userId}/role`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            ...headers as Record<string, string>
                        },
                        body: JSON.stringify(body),
                    });

                    if (!res.ok) {
                        throw new Error('Failed to update user role');
                    }

                    // Refresh users list
                    await get().fetchUsers({
                        limit: get().usersPagination.limit,
                        offset: get().usersPagination.offset,
                    });
                } catch (err) {
                    set({ error: (err as Error).message });
                    throw err;
                }
            },

            // Delete user (hard delete)
            deleteUser: async (userId: string) => {
                // Optimistic update
                const originalUsers = get().users;
                set({ users: originalUsers.filter(u => u.id !== userId) });

                try {
                    const headers = getAuthHeaders();
                    const res = await fetch(`/api/admin/users/${userId}`, {
                        method: 'DELETE',
                        headers: {
                            ...headers as Record<string, string>
                        }
                    });

                    if (!res.ok) {
                        throw new Error('Failed to delete user');
                    }

                    // Refresh users list to get updated count
                    await get().fetchUsers({
                        limit: get().usersPagination.limit,
                        offset: get().usersPagination.offset,
                    });
                } catch (err) {
                    // Revert on error
                    set({ users: originalUsers, error: (err as Error).message });
                    throw err;
                }
            },

            // Add resource for ingestion
            addResource: async (data: AddResourceRequest) => {
                try {
                    const headers = getAuthHeaders();
                    const res = await fetch('/api/admin/resources', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...headers as Record<string, string>
                        },
                        body: JSON.stringify(data),
                    });

                    if (!res.ok) {
                        const errorData = await res.json();
                        throw new Error(errorData.message || errorData.error || 'Failed to add resource');
                    }

                    // Refresh resources list
                    await get().fetchResources();
                } catch (err) {
                    set({ error: (err as Error).message });
                    throw err;
                }
            },

            // Delete resource
            deleteResource: async (resourceId: string) => {
                // Optimistic update
                const originalResources = get().resources;
                set({ resources: originalResources.filter(r => r.id !== resourceId) });

                try {
                    const headers = getAuthHeaders();
                    const res = await fetch(`/api/admin/resources/${resourceId}`, {
                        method: 'DELETE',
                        headers: {
                            ...headers as Record<string, string>
                        }
                    });

                    if (!res.ok) {
                        throw new Error('Failed to delete resource');
                    }

                    // Refresh resources list to get updated count
                    await get().fetchResources();
                } catch (err) {
                    // Revert on error
                    set({ resources: originalResources, error: (err as Error).message });
                    throw err;
                }
            },

            clearError: () => set({ error: null }),

            reset: () => set({
                stats: null,
                users: [],
                resources: [],
                usersPagination: { total: 0, limit: 20, offset: 0 },
                resourcesPagination: { total: 0, cursor: null },
                isLoadingStats: false,
                isLoadingUsers: false,
                isLoadingResources: false,
                error: null,
            }),
        }),
        { name: 'AdminStore' }
    )
);
