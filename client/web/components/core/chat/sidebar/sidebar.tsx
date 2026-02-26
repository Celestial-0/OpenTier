"use client";

import Link from "next/link";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  MoreHorizontalIcon,
  TrashIcon,
  ChevronsUpDown,
} from "lucide-react";
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ThreadItem {
  id: string;
  title: string;
  isActive?: boolean;
}

interface SidebarProps {
  threads?: ThreadItem[];
  isLoading?: boolean;
  activeThreadId?: string;
  onNewThread?: () => void;
  onSelectThread?: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onDeleteAllChats?: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
  onNavigateToDashboard?: (view: string) => void;
}

// ─── Thread List ─────────────────────────────────────────────────────────────

const ThreadListSkeleton = () => (
  <div className="flex flex-col gap-1">
    {Array.from({ length: 5 }, (_, i) => (
      <div
        key={`skeleton-${i}`}
        className="flex h-9 items-center px-3"
        role="status"
        aria-label="Loading threads"
      >
        <Skeleton className="h-4 w-full" />
      </div>
    ))}
  </div>
);

const ThreadListItem = ({
  thread,
  onSelect,
  onDelete,
}: {
  thread: ThreadItem;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}) => (
  <div
    className={cn(
      "group flex h-9 items-center gap-2 rounded-lg transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
      thread.isActive && "bg-muted"
    )}
  >
    <button
      type="button"
      className="flex h-full min-w-0 flex-1 items-center truncate px-3 text-start text-sm"
      onClick={() => onSelect?.(thread.id)}
    >
      {thread.title || "New Chat"}
    </button>
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 size-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:bg-accent data-[state=open]:opacity-100"
          >
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">More options</span>
          </Button>
        }
      />
      <DropdownMenuContent
        side="bottom"
        align="start"
        className="z-50 min-w-32"
      >
        <DropdownMenuItem onClick={() => onDelete?.(thread.id)}>
          <TrashIcon className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

// ─── User Menu ───────────────────────────────────────────────────────────────

const UserMenu = ({
  user,
  onLogout,
  onNavigateToDashboard,
}: {
  user: { name: string; email: string; avatar?: string };
  onLogout?: () => void;
  onNavigateToDashboard?: (view: string) => void;
}) => {
  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : "U";

  const menuItems = [
    { label: "Dashboard", view: "overview" },
    { label: "Settings", view: "settings" },
    { label: "Notifications", view: "notifications" },
  ];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full focus-visible:outline-none">
            <div
              className={cn(
                sidebarMenuButtonVariants({ size: "lg" }),
                "w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 ease-in-out hover:bg-sidebar-accent/50"
              )}
            >
              <Avatar className="h-8 w-8 rounded-lg border border-border/50">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/50" />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-xl border-border/50 bg-background/95 backdrop-blur-xl shadow-xl"
            side="bottom"
            align="end"
            sideOffset={12}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg border border-border/50">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1 bg-border/50" />

            <DropdownMenuGroup>
              {menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  onClick={() => onNavigateToDashboard?.(item.view)}
                  className="group gap-3 p-2 cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <span className="font-medium text-sm">{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1 bg-border/50" />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={onLogout}
                className="group gap-3 p-2 cursor-pointer focus:bg-accent focus:text-accent-foreground"
              >
                <span className="font-medium text-sm text-red-500">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export const Sidebar = ({
  threads = [],
  isLoading = false,
  onNewThread,
  onSelectThread,
  onDeleteThread,
  onDeleteAllChats,
  user = { name: "User", email: "m@example.com" },
  onLogout,
  onNavigateToDashboard,
}: SidebarProps) => {
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const isMobile = useIsMobile();

  const handleDeleteAll = () => {
    onDeleteAllChats?.();
    setShowDeleteAllDialog(false);
  };

  return (
    <SidebarUI>
      <SidebarHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center">
            <span className="font-semibold text-lg tracking-tight">OpenTier</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteAllDialog(true)} className="h-8 w-8 text-foreground hover:bg-muted">
              <HugeiconsIcon icon={Delete01Icon} size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNewThread} className="h-8 w-8 text-foreground hover:bg-muted">
              <HugeiconsIcon icon={PlusSignIcon} size={20} />
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <div className="flex flex-col gap-1">
          <div className="px-2 pb-2 pt-2">
            <h3 className="text-xs font-semibold text-muted-foreground">Last 7 days</h3>
          </div>
          {isLoading ? (
            <ThreadListSkeleton />
          ) : threads.length > 0 ? (
            threads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                onSelect={onSelectThread}
                onDelete={onDeleteThread}
              />
            ))
          ) : (
            <ThreadListItem
              thread={{ id: "new", title: "New conversation" }}
              onSelect={onSelectThread}
            />
          )}

          <div className="px-2 pt-6">
            <p className="text-[14px] text-muted-foreground leading-snug">
              You have reached the end of your chat history.
            </p>
          </div>
        </div>
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter className="border-t flex items-center">
        <UserMenu
          user={user}
          onLogout={onLogout}
          onNavigateToDashboard={onNavigateToDashboard}
        />
      </SidebarFooter>

      {isMobile ? (
        <Drawer open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
          <DrawerContent className="bg-[#09090b] border-t border-zinc-800 px-4 pt-2">
            <DrawerHeader className="text-left px-0 pt-4">
              <DrawerTitle className="text-[20px] font-bold text-white tracking-tight">Delete all chats?</DrawerTitle>
              <DrawerDescription className="text-[15px] leading-relaxed text-[#a1a1aa] mt-3">
                This action cannot be undone. This will permanently delete all your chats
                and remove them from our servers.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="px-0 pb-8 pt-6 flex-row gap-3">
              <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)} className="flex-1 bg-transparent border-zinc-800 text-white hover:bg-zinc-900 border font-medium py-6 rounded-xl text-[15px]">Cancel</Button>
              <Button onClick={handleDeleteAll} className="flex-1 bg-white text-black hover:bg-zinc-200 font-medium py-6 rounded-xl text-[15px]">Delete All</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
          <DialogContent showCloseButton={false} className="bg-[#09090b] border border-zinc-800 rounded-[14px] p-6 sm:max-w-[480px] gap-8 shadow-2xl">
            <div className="flex flex-col gap-3">
              <DialogTitle className="text-[22px] font-bold text-white tracking-tight">Delete all chats?</DialogTitle>
              <DialogDescription className="text-[15px] leading-relaxed text-[#A1A1AA]">
                This action cannot be undone. This will permanently delete all your chats
                and remove them from our servers.
              </DialogDescription>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)} className="bg-transparent border-zinc-800 border text-white hover:bg-zinc-900 hover:text-white font-medium px-6 py-[22px] h-auto rounded-xl text-[15px]">Cancel</Button>
              <Button onClick={handleDeleteAll} className="bg-white text-black hover:bg-white/90 font-medium px-6 py-[22px] h-auto rounded-xl text-[15px]">Delete All</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SidebarUI>
  );
};