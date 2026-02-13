"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * UI Context
 * 
 * Manages transient UI state that needs to be accessible globally but
 * doesn't need persistence or complex logic suitable for a store.
 */

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
    activeDashboardTab: string;
    setActiveDashboardTab: (tab: string) => void;
}

const UiContext = createContext<UiContextType | undefined>(undefined);

export function UiProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpenState] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeDashboardTab, setActiveDashboardTab] = useState("overview");

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
                activeDashboardTab,
                setActiveDashboardTab,
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
