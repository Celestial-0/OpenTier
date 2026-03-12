import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
    AddResourceRequest,
    AdminStats,
    ResourceItemResponse,
    SubmissionItem,
    UserAdminView,
} from '@/lib/api-types';
import {
    addResourceApi,
    deleteResourceApi,
    deleteUserApi,
    fetchAdminStatsApi,
    fetchAdminUsersApi,
    fetchResourcesApi,
    getResourceStatusApi,
    toggleUserDisabledApi,
    updateUserLimitApi,
    updateUserRoleApi,
} from '@/lib/api/admin-api';
import { getSubmissionQueue as getSubmissionQueueApi, reviewSubmission as reviewSubmissionApi } from '@/lib/api/contributor-api';

export interface IngestionJob {
    resource_id: string;
    job_id: string;
    label: string;
    status: string;
    progress: number;
    chunks_created: number;
    error?: string;
    created_at: number;
}

interface UsersPagination {
    total: number;
    limit: number;
    offset: number;
}

interface ResourcesPagination {
    total: number;
    cursor: string | null;
}

interface QueueReviewState {
    submissionId: string | null;
    action: 'approve' | 'reject' | null;
    loading: boolean;
}

interface AdminState {
    stats: AdminStats | null;
    users: UserAdminView[];
    resources: ResourceItemResponse[];
    jobs: IngestionJob[];
    queueItems: SubmissionItem[];
    queueTotal: number;
    queueStatusFilter: string;
    queueReview: QueueReviewState;

    usersPagination: UsersPagination;
    resourcesPagination: ResourcesPagination;

    activeTab: string;
    isLoadingStats: boolean;
    isLoadingUsers: boolean;
    isLoadingResources: boolean;
    isLoadingQueue: boolean;
    error: string | null;

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
    setQueueStatusFilter: (status: string) => void;
    fetchSubmissionQueue: () => Promise<void>;
    reviewSubmissionItem: (submissionId: string, action: 'approve' | 'reject', feedback?: string) => Promise<void>;
    clearError: () => void;
    reset: () => void;

    trackJob: (job: Omit<IngestionJob, 'progress' | 'chunks_created' | 'created_at'>) => void;
    dismissJob: (resource_id: string) => void;
    pollJobs: () => Promise<void>;
}

const initialQueueReview: QueueReviewState = {
    submissionId: null,
    action: null,
    loading: false,
};

export const useAdminStore = create<AdminState>()(
    devtools(
        persist(
            (set, get) => ({
                stats: null,
                users: [],
                resources: [],
                jobs: [],
                queueItems: [],
                queueTotal: 0,
                queueStatusFilter: 'pending',
                queueReview: initialQueueReview,
                usersPagination: { total: 0, limit: 20, offset: 0 },
                resourcesPagination: { total: 0, cursor: null },
                activeTab: 'stats',
                isLoadingStats: false,
                isLoadingUsers: false,
                isLoadingResources: false,
                isLoadingQueue: false,
                error: null,

                setActiveTab: (tab) => set({ activeTab: tab }),

                fetchStats: async () => {
                    set({ isLoadingStats: true, error: null });
                    try {
                        const stats = await fetchAdminStatsApi();
                        set({ stats, isLoadingStats: false });
                    } catch (err) {
                        set({ stats: null, error: (err as Error).message, isLoadingStats: false });
                    }
                },

                fetchUsers: async (params = {}) => {
                    set({ isLoadingUsers: true, error: null });
                    try {
                        const { search = '', limit = 20, offset = 0 } = params;
                        const data = await fetchAdminUsersApi({ search, limit, offset });
                        set({
                            users: data.users,
                            usersPagination: {
                                total: data.total_count,
                                limit: data.limit,
                                offset: data.offset,
                            },
                            isLoadingUsers: false,
                        });
                    } catch (err) {
                        set({
                            users: [],
                            usersPagination: { total: 0, limit: 20, offset: 0 },
                            error: (err as Error).message,
                            isLoadingUsers: false,
                        });
                    }
                },

                fetchResources: async (params = {}) => {
                    set({ isLoadingResources: true, error: null });
                    try {
                        const { resource_type, status, limit = 20, cursor } = params;
                        const data = await fetchResourcesApi({ resource_type, status, limit, cursor });
                        set({
                            resources: data.items,
                            resourcesPagination: {
                                total: data.total,
                                cursor: data.next_cursor || null,
                            },
                            isLoadingResources: false,
                        });
                    } catch (err) {
                        set({
                            resources: [],
                            resourcesPagination: { total: 0, cursor: null },
                            error: (err as Error).message,
                            isLoadingResources: false,
                        });
                    }
                },

                updateUserRole: async (userId, role) => {
                    try {
                        await updateUserRoleApi(userId, role);
                        await get().fetchUsers({
                            limit: get().usersPagination.limit,
                            offset: get().usersPagination.offset,
                        });
                    } catch (err) {
                        set({ error: (err as Error).message });
                        throw err;
                    }
                },

                updateUserLimit: async (userId, message_limit) => {
                    try {
                        await updateUserLimitApi(userId, message_limit);
                        await get().fetchUsers({
                            limit: get().usersPagination.limit,
                            offset: get().usersPagination.offset,
                        });
                    } catch (err) {
                        set({ error: (err as Error).message });
                        throw err;
                    }
                },

                toggleUserDisabled: async (userId, disabled) => {
                    try {
                        await toggleUserDisabledApi(userId, disabled);
                        await get().fetchUsers({
                            limit: get().usersPagination.limit,
                            offset: get().usersPagination.offset,
                        });
                    } catch (err) {
                        set({ error: (err as Error).message });
                        throw err;
                    }
                },

                deleteUser: async (userId) => {
                    const originalUsers = get().users;
                    set({ users: originalUsers.filter((u) => u.id !== userId) });
                    try {
                        await deleteUserApi(userId);
                        await get().fetchUsers({
                            limit: get().usersPagination.limit,
                            offset: get().usersPagination.offset,
                        });
                    } catch (err) {
                        set({ users: originalUsers, error: (err as Error).message });
                        throw err;
                    }
                },

                addResource: async (data) => {
                    try {
                        const body = await addResourceApi(data);

                        get().trackJob({
                            resource_id: body.resource_id ?? '',
                            job_id: body.job_id ?? '',
                            label: data.title || data.content?.slice(0, 60) || 'New Resource',
                            status: body.status ?? 'queued',
                            error: undefined,
                        });

                        await get().fetchResources();
                    } catch (err) {
                        set({ error: (err as Error).message });
                        throw err;
                    }
                },

                deleteResource: async (resourceId) => {
                    const originalResources = get().resources;
                    set({ resources: originalResources.filter((r) => r.id !== resourceId) });
                    try {
                        await deleteResourceApi(resourceId);
                        await get().fetchResources();
                    } catch (err) {
                        set({ resources: originalResources, error: (err as Error).message });
                        throw err;
                    }
                },

                setQueueStatusFilter: (status) => set({ queueStatusFilter: status }),

                fetchSubmissionQueue: async () => {
                    const { queueStatusFilter } = get();
                    set({ isLoadingQueue: true, error: null });

                    try {
                        const data = await getSubmissionQueueApi(queueStatusFilter, 50);
                        set({
                            queueItems: data.items || [],
                            queueTotal: data.total || 0,
                            isLoadingQueue: false,
                        });
                    } catch (err) {
                        set({
                            queueItems: [],
                            queueTotal: 0,
                            error: (err as Error).message,
                            isLoadingQueue: false,
                        });
                    }
                },

                reviewSubmissionItem: async (submissionId, action, feedback) => {
                    set({
                        queueReview: {
                            submissionId,
                            action,
                            loading: true,
                        },
                        error: null,
                    });

                    try {
                        await reviewSubmissionApi(submissionId, {
                            action,
                            feedback: feedback?.trim() ? feedback : undefined,
                        });

                        set((state) => ({
                            queueItems: state.queueItems.filter((item) => item.id !== submissionId),
                            queueTotal: Math.max(0, state.queueTotal - 1),
                            queueReview: initialQueueReview,
                        }));
                    } catch (err) {
                        set({
                            error: (err as Error).message,
                            queueReview: {
                                submissionId,
                                action,
                                loading: false,
                            },
                        });
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
                            ...state.jobs.filter((j) => j.resource_id !== resource_id).slice(0, 19),
                        ],
                    }));
                },

                dismissJob: (resource_id) => {
                    set((state) => ({ jobs: state.jobs.filter((j) => j.resource_id !== resource_id) }));
                },

                pollJobs: async () => {
                    const activeJobs = get().jobs.filter(
                        (j) => j.status === 'queued' || j.status === 'processing'
                    );
                    if (activeJobs.length === 0) return;

                    let anyCompleted = false;

                    await Promise.allSettled(
                        activeJobs.map(async (job) => {
                            try {
                                const data = await getResourceStatusApi(job.resource_id, job.job_id);
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
                                // Ignore individual poll failures.
                            }
                        })
                    );

                    if (anyCompleted) {
                        await get().fetchResources();
                    }
                },

                reset: () =>
                    set({
                        stats: null,
                        users: [],
                        resources: [],
                        jobs: [],
                        queueItems: [],
                        queueTotal: 0,
                        queueStatusFilter: 'pending',
                        queueReview: initialQueueReview,
                        usersPagination: { total: 0, limit: 20, offset: 0 },
                        resourcesPagination: { total: 0, cursor: null },
                        activeTab: 'stats',
                        isLoadingStats: false,
                        isLoadingUsers: false,
                        isLoadingResources: false,
                        isLoadingQueue: false,
                        error: null,
                    }),
            }),
            {
                name: 'admin-storage',
                partialize: (state) => ({ activeTab: state.activeTab }),
            }
        ),
        { name: 'AdminStore' }
    )
);
