
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserStore } from '@/store/user-store';
import { useAdminStore } from '@/store/admin-store';
import { DashboardAddResourceRequest } from '@/types/dashboard';

/**
 * Admin Context
 * 
 * Provides admin-specific functionality and role verification.
 * Wraps the admin store and exposes methods for admin operations.
 */

interface AdminContextValue {
    isAdmin: boolean;
    isLoading: boolean;
    error: string | null;

    // Expose admin store methods
    fetchStats: () => Promise<void>;
    fetchUsers: (params?: { search?: string; limit?: number; offset?: number }) => Promise<void>;
    fetchResources: (params?: { resource_type?: string; status?: string; limit?: number; cursor?: string }) => Promise<void>;
    updateUserRole: (userId: string, role: string) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    addResource: (data: DashboardAddResourceRequest) => Promise<void>;
    deleteResource: (resourceId: string) => Promise<void>;
    clearError: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const user = useUserStore((state) => state.user);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const adminStore = useAdminStore();

    useEffect(() => {
        // Check if user has admin role
        if (user) {
            const userRole = user.role.toLowerCase();
            setIsAdmin(userRole === 'admin' || userRole === 'superadmin');
        } else {
            setIsAdmin(false);
        }
        setIsLoading(false);
    }, [user]);

    const value: AdminContextValue = {
        isAdmin,
        isLoading,
        error: adminStore.error,
        fetchStats: adminStore.fetchStats,
        fetchUsers: adminStore.fetchUsers,
        fetchResources: adminStore.fetchResources,
        updateUserRole: adminStore.updateUserRole,
        deleteUser: adminStore.deleteUser,
        addResource: adminStore.addResource,
        deleteResource: adminStore.deleteResource,
        clearError: adminStore.clearError,
    };

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

/**
 * Hook to access admin context
 * 
 * @throws Error if used outside of AdminProvider
 */
export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within AdminProvider');
    }
    return context;
};
