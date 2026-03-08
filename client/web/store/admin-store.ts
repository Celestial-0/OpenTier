import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
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

/** A tracked background ingestion job shown in the queue UI. */
export interface IngestionJob {
    /** The resource_id returned by the server */
    resource_id: string;
    /** The job_id returned by the server */
    job_id: string;
    /** Human-readable label (title / URL) */
    label: string;
    /** current status: queued | processing | completed | failed | partial */
    status: string;
    /** 0-100 */
    progress: number;
    /** Number of chunks created so far */
    chunks_created: number;
    /** Error message if failed */
    error?: string;
    /** When the job was created (ms epoch) */
    created_at: number;
}

/** Safely parse the error message from a non-OK fetch response.
 *  Handles both JSON bodies (our API errors) and plain-text bodies
 *  (e.g. gateway-level "Internal Server Error"). */
async function parseErrorResponse(res: Response, fallback: string): Promise<string> {
    try {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
            const data = await res.json();
            return data?.message ?? data?.error ?? fallback;
        }
        const text = await res.text();
        return text.trim() || fallback;
    } catch {
        return fallback;
    }
}

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

    /** Active / recent ingestion jobs tracked in the queue UI */
    jobs: IngestionJob[];

    // Pagination
    usersPagination: UsersPagination;
    resourcesPagination: ResourcesPagination;

    // UI State
    activeTab: string;
    isLoadingStats: boolean;
    isLoadingUsers: boolean;
    isLoadingResources: boolean;
    error: string | null;

    // Actions
    setActiveTab: (tab: string) => void;
    fetchStats: () => Promise<void>;
    fetchUsers: (params?: { search?: string; limit?: number; offset?: number }) => Promise<void>;
    fetchResources: (params?: { resource_type?: string; status?: string; limit?: number; cursor?: string }) => Promise<void>;
    updateUserRole: (userId: string, role: string) => Promise<void>;
    updateUserLimit: (userId: string, limit: number) => Promise<void>;
    toggleUserDisabled: (userId: string, disabled: boolean) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    addResource: (data: AddResourceRequest) => Promise<void>;
    deleteResource: (resourceId: string) => Promise<void>;
    clearError: () => void;
    reset: () => void;

    /** Register a new job immediately after addResource succeeds */
    trackJob: (job: Omit<IngestionJob, 'progress' | 'chunks_created' | 'created_at'>) => void;
    /** Remove a completed/failed job from the queue */
    dismissJob: (resource_id: string) => void;
    /** Poll all active (queued/processing) jobs once and update their status */
    pollJobs: () => Promise<void>;
}

export const useAdminStore = create<AdminState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                stats: null,
                users: [],
                resources: [],
                jobs: [],
                usersPagination: { total: 0, limit: 20, offset: 0 },
                resourcesPagination: { total: 0, cursor: null },
                activeTab: 'stats',
                isLoadingStats: false,
                isLoadingUsers: false,
                isLoadingResources: false,
                error: null,

                setActiveTab: (tab) => set({ activeTab: tab }),

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

                // Update user limit
                updateUserLimit: async (userId: string, message_limit: number) => {
                    try {
                        const headers = getAuthHeaders();
                        const res = await fetch(`/api/admin/users/${userId}/quota/limit`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                ...headers as Record<string, string>
                            },
                            body: JSON.stringify({ message_limit }),
                        });

                        if (!res.ok) throw new Error('Failed to update user limit');

                        await get().fetchUsers({
                            limit: get().usersPagination.limit,
                            offset: get().usersPagination.offset,
                        });
                    } catch (err) {
                        set({ error: (err as Error).message });
                        throw err;
                    }
                },

                // Toggle user disabled status
                toggleUserDisabled: async (userId: string, disabled: boolean) => {
                    try {
                        const headers = getAuthHeaders();
                        const res = await fetch(`/api/admin/users/${userId}/disable`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                ...headers as Record<string, string>
                            },
                            body: JSON.stringify({ disabled }),
                        });

                        if (!res.ok) throw new Error('Failed to toggle user disabled status');

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
                            const msg = await parseErrorResponse(res, 'Failed to add resource');
                            throw new Error(msg);
                        }

                        const body = await res.json();

                        // Register the job in the queue immediately
                        get().trackJob({
                            resource_id: body.resource_id ?? '',
                            job_id: body.job_id ?? '',
                            label: data.title || data.content?.slice(0, 60) || 'New Resource',
                            status: body.status ?? 'queued',
                            error: undefined,
                        });

                        // Refresh resources list (may not show yet while processing)
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

                trackJob: ({ resource_id, job_id, label, status, error }) => {
                    set((state) => ({
                        jobs: [
                            {
                                resource_id,
                                job_id,
                                label,
                                status,
                                progress: 0,
                                chunks_created: 0,
                                error,
                                created_at: Date.now(),
                            },
                            // Keep only the last 20 jobs, avoid duplicate resource_ids
                            ...state.jobs.filter((j) => j.resource_id !== resource_id).slice(0, 19),
                        ],
                    }));
                },

                dismissJob: (resource_id: string) => {
                    set((state) => ({
                        jobs: state.jobs.filter((j) => j.resource_id !== resource_id),
                    }));
                },

                pollJobs: async () => {
                    const activeJobs = get().jobs.filter(
                        (j) => j.status === 'queued' || j.status === 'processing'
                    );
                    if (activeJobs.length === 0) return;

                    const headers = getAuthHeaders();
                    let anyCompleted = false;

                    await Promise.allSettled(
                        activeJobs.map(async (job) => {
                            try {
                                const url = `/api/admin/resources/${job.resource_id}${job.job_id ? `?job_id=${job.job_id}` : ''}`;
                                const res = await fetch(url, {
                                    headers: { ...headers as Record<string, string> },
                                });
                                if (!res.ok) return;

                                const ct = res.headers.get('content-type') ?? '';
                                if (!ct.includes('application/json')) return;

                                const data = await res.json();
                                const prev = get().jobs.find((j) => j.resource_id === job.resource_id);
                                const newStatus: string = data.status ?? job.status;
                                const didComplete =
                                    prev?.status !== newStatus &&
                                    (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'partial');

                                if (didComplete) anyCompleted = true;

                                set((state) => ({
                                    jobs: state.jobs.map((j) =>
                                        j.resource_id === job.resource_id
                                            ? {
                                                ...j,
                                                status: newStatus,
                                                progress: data.progress ?? j.progress,
                                                chunks_created: data.chunks_created ?? j.chunks_created,
                                                error: data.error ?? j.error,
                                            }
                                            : j
                                    ),
                                }));
                            } catch {
                                // silently ignore individual poll failures
                            }
                        })
                    );

                    // If any job just completed, refresh the resources list so chunk counts update
                    if (anyCompleted) {
                        await get().fetchResources();
                    }
                },

                reset: () => set({
                    stats: null,
                    users: [],
                    resources: [],
                    jobs: [],
                    usersPagination: { total: 0, limit: 20, offset: 0 },
                    resourcesPagination: { total: 0, cursor: null },
                    activeTab: 'stats',
                    isLoadingStats: false,
                    isLoadingUsers: false,
                    isLoadingResources: false,
                    error: null,
                }),
            }),
            {
                name: 'admin-storage',
                partialize: (state) => ({ activeTab: state.activeTab }), // Only persist the active tab
            }
        ),
        { name: 'AdminStore' }
    )
);
