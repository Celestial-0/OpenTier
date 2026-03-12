import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
    UserResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
} from '@/lib/api-types';
import { UserPreferences, DashboardSession, DashboardView, Notification } from '@/types/dashboard';
import { getAuthToken } from '@/lib/auth-utils';
import {
    changePasswordApi,
    deleteAccountApi,
    fetchCurrentUserApi,
    listSessionsApi,
    revokeSessionApi,
    updateProfileApi,
} from '@/lib/api/user-api';

/**
 * User Store
 * 
 * Manages user preferences, cached user profile, and active sessions.
 */

interface UserState {
    // Data
    user: UserResponse | null;
    sessions: DashboardSession[];
    notifications: Notification[];
    preferences: UserPreferences;

    isLoading: boolean;
    isLoadingSessions: boolean;
    activeDashboardView: DashboardView;
    error: string | null;

    // Actions
    setUser: (user: UserResponse | null) => void;
    setActiveDashboardView: (view: DashboardView) => void;
    updatePreferences: (prefs: Partial<UserPreferences>) => void;
    resetPreferences: () => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;
    clearNotifications: () => void;
    removeNotification: (id: string) => void;

    // API Actions
    fetchUser: () => Promise<void>;
    updateProfile: (data: UpdateProfileRequest) => Promise<void>;
    changePassword: (data: ChangePasswordRequest) => Promise<void>;
    deleteAccount: () => Promise<void>; // Soft delete

    // Session Management
    fetchSessions: () => Promise<void>;
    revokeSession: (sessionId: string) => Promise<void>;

    clearError: () => void;
    logout: () => void;
}

export const useUserStore = create<UserState>()(
    devtools(
        persist(
            (set, get) => ({
                user: null,
                sessions: [],
                notifications: [],
                preferences: {
                    theme: 'system',
                    fontSize: 'medium',
                    notificationsEnabled: true,
                    emailNotifications: true,
                    pushNotifications: false,
                },
                isLoading: false,
                isLoadingSessions: false,
                activeDashboardView: 'overview',
                error: null,

                setUser: (user) => set({ user }),

                setActiveDashboardView: (view) => set({ activeDashboardView: view }),

                updatePreferences: (newPrefs) =>
                    set((state) => ({
                        preferences: { ...state.preferences, ...newPrefs },
                    })),

                addNotification: (notification) =>
                    set((state) => ({
                        notifications: [
                            {
                                id: crypto.randomUUID(),
                                timestamp: Date.now(),
                                read: false,
                                ...notification,
                            },
                            ...state.notifications,
                        ],
                    })),

                markNotificationAsRead: (id) =>
                    set((state) => ({
                        notifications: state.notifications.map((n) =>
                            n.id === id ? { ...n, read: true } : n
                        ),
                    })),

                markAllNotificationsAsRead: () =>
                    set((state) => ({
                        notifications: state.notifications.map((n) => ({ ...n, read: true })),
                    })),

                clearNotifications: () => set({ notifications: [] }),

                removeNotification: (id) =>
                    set((state) => ({
                        notifications: state.notifications.filter((n) => n.id !== id),
                    })),

                resetPreferences: () =>
                    set({
                        preferences: {
                            theme: 'system',
                            fontSize: 'medium',
                            notificationsEnabled: true,
                            emailNotifications: true,
                            pushNotifications: false,
                        },
                    }),

                fetchUser: async () => {
                    if (get().isLoading) return;

                    // Skip the API call if there's no token (prevents 401 error on load for unauthenticated users)
                    if (!getAuthToken()) {
                        set({ user: null, isLoading: false, error: null });
                        return;
                    }

                    set({ isLoading: true, error: null });
                    try {
                        const data = await fetchCurrentUserApi();
                        set({ user: data, isLoading: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoading: false, user: null });
                    }
                },

                updateProfile: async (data) => {
                    set({ isLoading: true, error: null });
                    try {
                        const updatedUser = await updateProfileApi(data);
                        // Optimistic merge or full replace if server returns full object
                        const currentUser = get().user;
                        if (currentUser) {
                            set({ user: { ...currentUser, ...data } as UserResponse });
                        }

                        if (updatedUser && updatedUser.id) {
                            set({ user: updatedUser });
                        }

                        set({ isLoading: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoading: false });
                        throw err;
                    }
                },

                changePassword: async (data) => {
                    set({ isLoading: true, error: null });
                    try {
                        await changePasswordApi(data);

                        set({ isLoading: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoading: false });
                        throw err;
                    }
                },

                deleteAccount: async () => {
                    set({ isLoading: true, error: null });
                    try {
                        await deleteAccountApi();
                        set({ user: null, sessions: [], isLoading: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoading: false });
                    }
                },

                fetchSessions: async () => {
                    if (get().isLoadingSessions) return;
                    set({ isLoadingSessions: true, error: null });
                    try {
                        const sessions = await listSessionsApi();
                        set({ sessions: sessions.sessions, isLoadingSessions: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoadingSessions: false });
                    }
                },

                revokeSession: async (sessionId) => {
                    // Optimistic update
                    const originalSessions = get().sessions;
                    set({ sessions: originalSessions.filter(s => s.id !== sessionId) });

                    try {
                        await revokeSessionApi(sessionId);
                    } catch (err) {
                        // Revert on error
                        set({ sessions: originalSessions, error: (err as Error).message });
                    }
                },

                clearError: () => set({ error: null }),

                logout: () => set({ user: null, sessions: [], notifications: [], error: null }),
            }),
            {
                name: 'user-storage', // Key for localStorage
                partialize: (state) => ({
                    notifications: state.notifications,
                    preferences: state.preferences,
                    activeDashboardView: state.activeDashboardView
                }), // Persist preferences and current view
            }
        ),
        { name: 'UserStore' }
    )
);

