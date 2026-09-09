"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { DashboardCommandDialog } from "./dashboard-command-dialog";
import { Overview } from "./overview";
import { CreditsTab } from "./credits";
import { Conversations } from "./conversations";
import { Sessions } from "./sessions";
import { Profile } from "./profile";
import { Settings } from "./settings";
import { Contributor } from "./contributor";
import { Admin } from "./admin";
import { useAuth } from "@/context/auth-context";
import { useUi } from "@/context/ui-context";
import { useAdminStore } from "@/store/admin-store";
import { DashboardView } from "@/types/dashboard";

export const DashboardUI = () => {
  const { user } = useAuth();
  const { activeDashboardView, setActiveDashboardView } = useUi();
  const { setActiveTab: setAdminActiveTab } = useAdminStore();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const searchParams = useSearchParams();

  // One-time deep-link sync on initial mount: reads query params if present,
  // sets in-memory state, and quietly clears the URL query string without router reload.
  useEffect(() => {
    const viewParam = searchParams.get("view") as DashboardView | null;
    const tabParam = searchParams.get("tab");

    const validViews: DashboardView[] = [
      "overview",
      "credits",
      "conversations",
      "sessions",
      "profile",
      "settings",
      "contributor",
      "admin",
    ];

    let hasQuery = false;

    if (viewParam && validViews.includes(viewParam)) {
      setActiveDashboardView(viewParam);
      hasQuery = true;
    }

    if (tabParam) {
      setAdminActiveTab(tabParam);
      hasQuery = true;
    }

    if (hasQuery && typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, setActiveDashboardView, setAdminActiveTab]);

  return (
    <SidebarProvider defaultOpen>
      {/* Collapsible Left Navigation Sidebar matching Wireframe */}
      <DashboardSidebar onSearchClick={() => setIsCommandOpen(true)} />

      {/* Main Content Inset with Header and Dynamic View Area */}
      <SidebarInset className="min-h-screen flex flex-col bg-background">
        <DashboardHeader />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeDashboardView === "overview" && <Overview />}
          {activeDashboardView === "credits" && <CreditsTab />}
          {activeDashboardView === "conversations" && <Conversations />}
          {activeDashboardView === "sessions" && <Sessions />}
          {activeDashboardView === "profile" && <Profile />}
          {activeDashboardView === "settings" && <Settings />}
          {activeDashboardView === "contributor" && (
            user?.role === "contributor" || user?.role === "admin" ? (
              <Contributor />
            ) : (
              <Overview />
            )
          )}
          {activeDashboardView === "admin" && (
            user?.role === "admin" ? <Admin /> : <Overview />
          )}
        </main>
      </SidebarInset>

      {/* Global Cmd+K Command Palette */}
      <DashboardCommandDialog
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
      />
    </SidebarProvider>
  );
};