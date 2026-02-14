import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification } from '@/types/dashboard';

interface NotificationState {
    notifications: Notification[];

    // Actions
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],

            addNotification: (data) =>
                set((state) => ({
                    notifications: [
                        {
                            id: crypto.randomUUID(),
                            timestamp: Date.now(),
                            read: false,
                            ...data,
                        },
                        ...state.notifications,
                    ],
                })),

            markAsRead: (id) =>
                set((state) => ({
                    notifications: state.notifications.map((n) =>
                        n.id === id ? { ...n, read: true } : n
                    ),
                })),

            markAllAsRead: () =>
                set((state) => ({
                    notifications: state.notifications.map((n) => ({ ...n, read: true })),
                })),

            clearAll: () => set({ notifications: [] }),

            removeNotification: (id) =>
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                })),
        }),
        {
            name: 'notification-storage',
        }
    )
);
