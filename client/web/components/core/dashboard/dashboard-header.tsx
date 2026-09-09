"use client";

import React, { useState } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/context/auth-context";
import { useUi } from "@/context/ui-context";
import { useUserStore } from "@/store/user-store";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import { OpentierLogo } from "@/components/core/common/logos/opentier";
import {
  Bell,
  Sun,
  Moon,
  Plus,
  User,
  Settings,
  Coins,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { DashboardView } from "@/types/dashboard";

export const DashboardHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { setActiveDashboardView } = useUi();
  const { notifications, markNotificationAsRead } = useUserStore();
  const { theme, setTheme } = useTheme();
  const { open, isMobile } = useSidebar();

  const unreadCount = notifications.filter((n) => !n.read).length;

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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/50 bg-background/95 px-4 backdrop-blur-md transition-all">
      {/* Left: Sidebar Trigger (only when sidebar is closed/mobile) & Workspace Indicator */}
      <div className="flex items-center gap-3">
        {(!open || isMobile) && (
          <>
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-4" />
          </>
        )}

        {/* User Account Workspace */}
        <div className="flex items-center gap-2 px-1 text-xs font-semibold text-foreground">
          <span className="truncate max-w-80">
            {user?.name ? `${user.name}'s Workspace` : "Personal Workspace"}
          </span>
        </div>
      </div>

      {/* Right: Actions, Notifications, Theme, User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick CTA */}
        <Link href="/chat">
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </Link>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="relative size-8 text-muted-foreground hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
                )}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-80 p-0 text-xs">
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <span className="font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationAsRead(n.id)}
                    className="p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {n.message}
                    </p>
                    <span className="text-xs text-muted-foreground/80 mt-1 block">
                      {formatDistanceToNow(new Date(n.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full ring-1 ring-border/60 hover:ring-primary/50 transition-all"
              >
                <Avatar className="size-8">
                  <AvatarImage src={user?.avatar_url || ""} alt={user?.name || "User"} />
                  <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56 text-xs">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal p-3 pb-2">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold leading-none text-foreground">
                      {user?.name || "Anonymous User"}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {user?.role || "user"}
                    </Badge>
                  </div>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email || "No email"}
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => setActiveDashboardView("profile")}
                className="gap-2 cursor-pointer"
              >
                <User className="size-3.5" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveDashboardView("credits")}
                className="gap-2 cursor-pointer"
              >
                <Coins className="size-3.5 text-muted-foreground" />
                <span>Credits & Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveDashboardView("settings")}
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
    </header>
  );
};
