'use client';

import React, { createContext, useContext } from 'react';
import { useUserStore } from '@/store/user-store';

/**
 * Contributor Context
 * 
 * Provides contributor-specific functionality and role verification.
 */

interface ContributorContextValue {
    isContributor: boolean;
    isLoading: boolean;
    // Space for future contributor actions, e.g., fetchOwnSubmissions()
}

const ContributorContext = createContext<ContributorContextValue | null>(null);

export const ContributorProvider = ({ children }: { children: React.ReactNode }) => {
    const user = useUserStore((state) => state.user);
    const isLoading = useUserStore((state) => state.isLoading);
    const userRole = user?.role.toLowerCase();
    const isContributor = userRole === 'contributor' || userRole === 'admin';

    const value: ContributorContextValue = {
        isContributor,
        isLoading,
    };

    return <ContributorContext.Provider value={value}>{children}</ContributorContext.Provider>;
};

/**
 * Hook to access contributor context
 * 
 * @throws Error if used outside of ContributorProvider
 */
export const useContributor = () => {
    const context = useContext(ContributorContext);
    if (!context) {
        throw new Error('useContributor must be used within ContributorProvider');
    }
    return context;
};
