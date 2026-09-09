"use client";

import React, { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUi } from "@/context/ui-context";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  MessageSquare,
  Coins,
  Shield,
  User,
  Settings,
  Plus,
  Cpu,
  Users,
  Database,
  Activity,
  Layers,
} from "lucide-react";
import { DashboardView } from "@/types/dashboard";
import { useAdminStore } from "@/store/admin-store";

interface DashboardCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DashboardCommandDialog: React.FC<DashboardCommandDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { setActiveDashboardView } = useUi();
  const { user } = useAuth();
  const router = useRouter();

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelectView = (view: DashboardView, adminTab?: string) => {
    setActiveDashboardView(view);
    if (adminTab) {
      useAdminStore.getState().setActiveTab(adminTab);
    }
    onOpenChange(false);
  };

  const handleNewChat = () => {
    router.push("/chat");
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search dashboard..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={handleNewChat} className="gap-2">
            <Plus className="size-4 text-emerald-500" />
            <span>Start New Chat</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectView("credits")} className="gap-2">
            <Coins className="size-4 text-amber-500" />
            <span>Manage Credits & Billing</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Dashboards & Analytics">
          <CommandItem onSelect={() => handleSelectView("overview")} className="gap-2">
            <BarChart3 className="size-4 text-primary" />
            <span>AI Analytics (Overview)</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectView("conversations")} className="gap-2">
            <MessageSquare className="size-4" />
            <span>Conversations</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectView("credits")} className="gap-2">
            <Coins className="size-4 text-amber-500" />
            <span>Credits & Usage</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectView("sessions")} className="gap-2">
            <Shield className="size-4" />
            <span>Active Sessions & Security</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem onSelect={() => handleSelectView("profile")} className="gap-2">
            <User className="size-4" />
            <span>User Profile</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectView("settings")} className="gap-2">
            <Settings className="size-4" />
            <span>Settings & Preferences</span>
          </CommandItem>
        </CommandGroup>

        {(user?.role === "contributor" || user?.role === "admin") && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Contributor">
              <CommandItem onSelect={() => handleSelectView("contributor")} className="gap-2">
                <Layers className="size-4 text-blue-400" />
                <span>Knowledge Submissions Queue</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {user?.role === "admin" && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Administration">
              <CommandItem onSelect={() => handleSelectView("admin", "models")} className="gap-2">
                <Cpu className="size-4 text-purple-400" />
                <span>AI Model Catalog</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelectView("admin", "users")} className="gap-2">
                <Users className="size-4 text-emerald-400" />
                <span>User Management</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelectView("admin", "resources")} className="gap-2">
                <Database className="size-4 text-cyan-400" />
                <span>Knowledge Base Resources</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelectView("admin", "monitoring")} className="gap-2">
                <Activity className="size-4 text-amber-400" />
                <span>System Health & Monitoring</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};
