import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
    UserResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
    UserResponseSchema,
    Session,
    SessionListResponseSchema
} from '@/lib/api-types';
import { getAuthHeaders } from '@/lib/auth-utils';

/**
 * User Store
 * 
 * Manages user preferences, cached user profile, and active sessions.
 */

interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    notificationsEnabled: boolean;
}

interface UserState {
    // Data
    user: UserResponse | null;
    sessions: Session[];
    preferences: UserPreferences;

    // UI State
    isLoading: boolean;
    isLoadingSessions: boolean;
    error: string | null;

    // Actions
    setUser: (user: UserResponse | null) => void;
    updatePreferences: (prefs: Partial<UserPreferences>) => void;
    resetPreferences: () => void;

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
                preferences: {
                    theme: 'system',
                    fontSize: 'medium',
                    notificationsEnabled: true,
                },
                isLoading: false,
                isLoadingSessions: false,
                error: null,

                setUser: (user) => set({ user }),

                updatePreferences: (newPrefs) =>
                    set((state) => ({
                        preferences: { ...state.preferences, ...newPrefs },
                    })),

                resetPreferences: () =>
                    set({
                        preferences: {
                            theme: 'system',
                            fontSize: 'medium',
                            notificationsEnabled: true,
                        },
                    }),

                fetchUser: async () => {
                    set({ isLoading: true, error: null });
                    try {
                        const headers = getAuthHeaders();
                        const res = await fetch('/api/user/me', {
                            headers: {
                                ...headers as Record<string, string>
                            }
                        });

                        if (res.status === 401) {
                            // Token invalid or expired
                            set({ user: null, isLoading: false });
                            return;
                        }

                        if (!res.ok) throw new Error('Failed to fetch user');
                        const data = await res.json();

                        // Validate with Zod
                        const parsed = UserResponseSchema.safeParse(data);
                        if (!parsed.success) {
                            console.error('Invalid user data:', parsed.error);
                            throw new Error('Invalid user data received');
                        }

                        set({ user: parsed.data, isLoading: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoading: false, user: null });
                    }
                },

                updateProfile: async (data) => {
                    set({ isLoading: true, error: null });
                    try {
                        const headers = getAuthHeaders();
                        const res = await fetch('/api/user/update-profile', {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                ...headers as Record<string, string>
                            },
                            body: JSON.stringify(data),
                        });

                        if (!res.ok) throw new Error('Failed to update profile');

                        const updatedUser = await res.json();
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
                        const headers = getAuthHeaders();
                        const res = await fetch('/api/user/change-password', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...headers as Record<string, string>
                            },
                            body: JSON.stringify(data),
                        });

                        if (!res.ok) {
                            const errData = await res.json();
                            throw new Error(errData.message || 'Failed to change password');
                        }

                        set({ isLoading: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoading: false });
                        throw err;
                    }
                },

                deleteAccount: async () => {
                    set({ isLoading: true, error: null });
                    try {
                        const headers = getAuthHeaders();
                        const res = await fetch('/api/user/delete-account', {
                            method: 'DELETE',
                            headers: {
                                ...headers as Record<string, string>
                            }
                        });
                        if (!res.ok) throw new Error('Failed to delete account');
                        set({ user: null, sessions: [], isLoading: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoading: false });
                    }
                },

                fetchSessions: async () => {
                    set({ isLoadingSessions: true, error: null });
                    try {
                        const headers = getAuthHeaders();
                        const res = await fetch('/api/user/list-sessions', {
                            headers: {
                                ...headers as Record<string, string>
                            }
                        });
                        if (!res.ok) throw new Error('Failed to fetch sessions');

                        const data = await res.json();
                        const parsed = SessionListResponseSchema.safeParse(data);

                        if (!parsed.success) {
                            console.error('Invalid session list:', parsed.error);
                            throw new Error('Invalid session data received');
                        }

                        set({ sessions: parsed.data.sessions, isLoadingSessions: false });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoadingSessions: false });
                    }
                },

                revokeSession: async (sessionId) => {
                    // Optimistic update
                    const originalSessions = get().sessions;
                    set({ sessions: originalSessions.filter(s => s.id !== sessionId) });

                    try {
                        const headers = getAuthHeaders();
                        const res = await fetch(`/api/user/sessions/${sessionId}`, {
                            method: 'DELETE',
                            headers: {
                                ...headers as Record<string, string>
                            }
                        });
                        if (!res.ok) throw new Error('Failed to revoke session');
                    } catch (err) {
                        // Revert on error
                        set({ sessions: originalSessions, error: (err as Error).message });
                    }
                },

                clearError: () => set({ error: null }),

                logout: () => set({ user: null, sessions: [], error: null }),
            }),
            {
                name: 'user-storage', // Key for localStorage
                partialize: (state) => ({ preferences: state.preferences }), // Only persist preferences
            }
        ),
        { name: 'UserStore' }
    )
);

