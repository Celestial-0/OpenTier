"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * UI Context
 * 
 * Manages transient UI state that needs to be accessible globally but
 * doesn't need persistence or complex logic suitable for a store.
 */

export type DashboardView =
    | "overview"
    | "conversations"
    | "sessions"
    | "notifications"
    | "profile"
    | "settings";

interface UiContextType {
    // Sidebar State
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;

    // Global Search
    isSearchOpen: boolean;
    setSearchOpen: (open: boolean) => void;

    // Active Modal (if using a global modal manager concept)
    activeModal: string | null;
    openModal: (modalId: string) => void;
    closeModal: () => void;

    // Dashboard Navigation
    activeDashboardView: DashboardView;
    setActiveDashboardView: (view: DashboardView) => void;
    navigateToDashboard: (view: DashboardView) => void;
}

const UiContext = createContext<UiContextType | undefined>(undefined);

export function UiProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [isSidebarOpen, setIsSidebarOpenState] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeDashboardView, setActiveDashboardView] = useState<DashboardView>("overview");

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpenState((prev) => !prev);
    }, []);

    const setSidebarOpen = useCallback((open: boolean) => {
        setIsSidebarOpenState(open);
    }, []);

    const openModal = useCallback((modalId: string) => {
        setActiveModal(modalId);
    }, []);

    const closeModal = useCallback(() => {
        setActiveModal(null);
    }, []);

    const navigateToDashboard = useCallback((view: DashboardView) => {
        setActiveDashboardView(view);
        if (pathname !== "/dashboard") {
            router.push("/dashboard");
        }
    }, [pathname, router]);

    return (
        <UiContext.Provider
            value={{
                isSidebarOpen,
                toggleSidebar,
                setSidebarOpen,
                isSearchOpen,
                setSearchOpen: setIsSearchOpen,
                activeModal,
                openModal,
                closeModal,
                activeDashboardView,
                setActiveDashboardView,
                navigateToDashboard,
            }}
        >
            {children}
        </UiContext.Provider>
    );
}

export function useUi() {
    const context = useContext(UiContext);
    if (context === undefined) {
        throw new Error("useUi must be used within a UiProvider");
    }
    return context;
}
