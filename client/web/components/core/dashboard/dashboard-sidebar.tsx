"use client";

import React, { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  MessageSquare,
  Coins,
  Shield,
  User,
  Settings,
  BookOpen,
  Cpu,
  Users,
  Database,
  Activity,
  LineChart,
  Search,
  Sparkles,
  ArrowUpRight,
  Zap,
  ChevronsUpDown,
  Check,
  Plus,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useUi } from "@/context/ui-context";
import { useAuth } from "@/context/auth-context";
import { useChatStore } from "@/store/chat-store";
import { useCreditsStore } from "@/store/credits-store";
import { useAdminStore } from "@/store/admin-store";
import { DashboardView } from "@/types/dashboard";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { OpentierLogo } from "@/components/core/common/logos/opentier";

interface DashboardSidebarProps {
  onSearchClick?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  onSearchClick,
}) => {
  const { activeDashboardView, setActiveDashboardView } = useUi();
  const { user, logout } = useAuth();
  const { totalConversationsCount } = useChatStore();
  const { summary } = useCreditsStore();
  const { activeTab: adminActiveTab, setActiveTab: setAdminActiveTab } = useAdminStore();
  const { isMobile, setOpenMobile, open } = useSidebar();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleNavClick = (view: DashboardView, adminTab?: string) => {
    setActiveDashboardView(view);
    if (adminTab) {
      setAdminActiveTab(adminTab as any);
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border/60 bg-sidebar">
      {/* Workspace Header */}
      <SidebarHeader className="p-3 border-b border-sidebar-border/50 space-y-2">
        <div className="flex items-center justify-between gap-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-1 py-0.5 flex-1 min-w-0 hover:opacity-90 transition-opacity"
          >
            <OpentierLogo className="size-6 shrink-0" />
            <div className="flex flex-col text-left leading-tight truncate group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold text-sidebar-foreground text-sm tracking-tight">
                OpenTier
              </span>
            </div>
          </Link>

          {open && (
            <SidebarTrigger className="hidden md:flex size-8 text-muted-foreground hover:text-sidebar-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
          )}
        </div>

        {/* Search Bar matching Wireframe (Search... ⌘K) */}
        <button
          type="button"
          onClick={onSearchClick}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border/60 text-xs text-muted-foreground transition-all group-data-[collapsible=icon]:hidden cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5 opacity-70" />
            <span>Search...</span>
          </div>
          <kbd className="text-xs font-mono bg-background/80 border border-border/60 rounded px-1.5 py-0.5 text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Dashboards Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
            Dashboards
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* AI Analytics */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeDashboardView === "overview"}
                  onClick={() => handleNavClick("overview")}
                  tooltip="AI Analytics"
                  className={cn(
                    "text-xs font-medium transition-all group/menu-button",
                    activeDashboardView === "overview" &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  )}
                >
                  <BarChart3 className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                  <span>AI Analytics</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-xs font-medium leading-4 h-4 border-border/60"
                  >
                    New
                  </Badge>
                </SidebarMenuBadge>
              </SidebarMenuItem>

              {/* Conversations */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeDashboardView === "conversations"}
                  onClick={() => handleNavClick("conversations")}
                  tooltip="Conversations"
                  className={cn(
                    "text-xs font-medium group/menu-button",
                    activeDashboardView === "conversations" &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  )}
                >
                  <MessageSquare className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                  <span>Conversations</span>
                </SidebarMenuButton>
                {totalConversationsCount > 0 && (
                  <SidebarMenuBadge className="text-xs font-mono font-medium text-muted-foreground">
                    {totalConversationsCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>

              {/* Credits & Billing */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeDashboardView === "credits"}
                  onClick={() => handleNavClick("credits")}
                  tooltip="Credits & Billing"
                  className={cn(
                    "text-xs font-medium group/menu-button",
                    activeDashboardView === "credits" &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  )}
                >
                  <Coins className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                  <span>Credits & Billing</span>
                </SidebarMenuButton>
                {summary && (
                  <SidebarMenuBadge className="text-xs font-mono font-semibold text-primary">
                    {Number(summary.balance).toFixed(2)} cr
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>

              {/* Sessions & Security */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeDashboardView === "sessions"}
                  onClick={() => handleNavClick("sessions")}
                  tooltip="Sessions & Security"
                  className={cn(
                    "text-xs font-medium group/menu-button",
                    activeDashboardView === "sessions" &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  )}
                >
                  <Shield className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                  <span>Sessions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeDashboardView === "profile"}
                  onClick={() => handleNavClick("profile")}
                  tooltip="Profile"
                  className={cn(
                    "text-xs font-medium group/menu-button",
                    activeDashboardView === "profile" &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  )}
                >
                  <User className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeDashboardView === "settings"}
                  onClick={() => handleNavClick("settings")}
                  tooltip="Settings"
                  className={cn(
                    "text-xs font-medium group/menu-button",
                    activeDashboardView === "settings" &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  )}
                >
                  <Settings className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Knowledge & Contributor Group */}
        {(user?.role === "contributor" || user?.role === "admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Knowledge Base
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeDashboardView === "contributor"}
                    onClick={() => handleNavClick("contributor")}
                    tooltip="Submissions Queue"
                    className={cn(
                      "text-xs font-medium group/menu-button",
                      activeDashboardView === "contributor" &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                    )}
                  >
                    <BookOpen className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                    <span>Submissions Queue</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administration Group */}
        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeDashboardView === "admin" && adminActiveTab === "models"}
                    onClick={() => handleNavClick("admin", "models")}
                    tooltip="AI Models Catalog"
                    className={cn(
                      "text-xs font-medium group/menu-button",
                      activeDashboardView === "admin" &&
                        adminActiveTab === "models" &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                    )}
                  >
                    <Cpu className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                    <span>AI Model Catalog</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeDashboardView === "admin" && adminActiveTab === "users"}
                    onClick={() => handleNavClick("admin", "users")}
                    tooltip="User Directory"
                    className={cn(
                      "text-xs font-medium group/menu-button",
                      activeDashboardView === "admin" &&
                        adminActiveTab === "users" &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                    )}
                  >
                    <Users className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                    <span>User Management</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeDashboardView === "admin" && adminActiveTab === "resources"}
                    onClick={() => handleNavClick("admin", "resources")}
                    tooltip="Resource Management"
                    className={cn(
                      "text-xs font-medium group/menu-button",
                      activeDashboardView === "admin" &&
                        adminActiveTab === "resources" &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                    )}
                  >
                    <Database className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                    <span>Resources</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeDashboardView === "admin" && adminActiveTab === "monitoring"}
                    onClick={() => handleNavClick("admin", "monitoring")}
                    tooltip="System Health & Monitoring"
                    className={cn(
                      "text-xs font-medium group/menu-button",
                      activeDashboardView === "admin" &&
                        adminActiveTab === "monitoring" &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                    )}
                  >
                    <Activity className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                    <span>System Health</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={
                      activeDashboardView === "admin" &&
                      (adminActiveTab === "stats" || !adminActiveTab)
                    }
                    onClick={() => handleNavClick("admin", "stats")}
                    tooltip="Platform Telemetry"
                    className={cn(
                      "text-xs font-medium group/menu-button",
                      activeDashboardView === "admin" &&
                        (adminActiveTab === "stats" || !adminActiveTab) &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                    )}
                  >
                    <LineChart className="size-4 text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-[active=true]/menu-button:text-primary" />
                    <span>Platform Telemetry</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Sidebar Footer: Promo Plan Container + User Menu (NavUser) */}
      <SidebarFooter className="p-3 border-t border-sidebar-border/40 space-y-3">
        {/* Credits Balance Container matching Wireframe */}
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2.5 shadow-xs group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" />
              <span className="text-xs font-semibold text-card-foreground">
                Credits Balance
              </span>
            </div>
            <span className="text-xs font-bold font-mono text-primary">
              {summary ? `${Number(summary.balance).toFixed(2)} cr` : "0.00 cr"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Real-time multi-model LLM execution & automated ingestion.
          </p>

          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8 gap-1.5 border-border hover:bg-accent text-foreground font-medium cursor-pointer"
            onClick={() => handleNavClick("credits")}
          >
            <span>Manage Credits</span>
            <ArrowUpRight className="size-3" />
          </Button>
        </div>

        {/* User Profile / Account Controls (NavUser) */}
        <div className="pt-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="w-full h-12 p-2 flex items-center justify-between text-left hover:bg-sidebar-accent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-8 rounded-lg shrink-0">
                      <AvatarImage
                        src={user?.avatar_url || ""}
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback className="text-xs font-semibold bg-muted text-foreground rounded-lg">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                      <span className="text-xs font-semibold text-sidebar-foreground truncate">
                        {user?.name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user?.email || "No email"}
                      </span>
                    </div>
                  </div>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden opacity-60" />
                </Button>
              }
            />
            <DropdownMenuContent
              side={isMobile ? "bottom" : "right"}
              align="end"
              className="w-56 text-xs"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal p-2 pb-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">
                      {user?.name || "User"}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {user?.role || "user"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {user?.email}
                  </p>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => router.push("/chat")}
                  className="gap-2 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>New Chat</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="gap-2 cursor-pointer"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="size-3.5" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="size-3.5" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick("profile")}
                  className="gap-2 cursor-pointer"
                >
                  <User className="size-3.5" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick("settings")}
                  className="gap-2 cursor-pointer"
                >
                  <Settings className="size-3.5" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="size-3.5" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
