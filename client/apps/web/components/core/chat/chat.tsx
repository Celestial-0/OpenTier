"use client";

import { ChatArea } from "@/components/core/chat/chatarea/chatarea";
import { Sidebar } from "@/components/core/chat/sidebar/sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Suspense, useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useChatStore } from "@/store/chat-store";
import { useAuth } from "@/context/auth-context";

interface ChatProps {
  children: React.ReactNode;
}

export const Chat = ({ children }: ChatProps) => {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.id as string | undefined;
  const { user, logout } = useAuth();

  // ── Store ──────────────────────────────────────────────────────────────
  const {
    conversations,
    activeConversationId,
    isLoadingConversations,
    fetchConversations,
    selectConversation,
    createNewConversation,
    deleteConversation,
    reset: resetChatStore,
  } = useChatStore();

  // ── Initialization ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations(true);
  }, [fetchConversations]);

  // Sync route param → store
  const prevConversationId = useRef(conversationId);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const isFirst = isFirstRender.current;
    isFirstRender.current = false;

    if (conversationId) {
      if (isFirst || conversationId !== prevConversationId.current) {
        selectConversation(conversationId);
      }
    } else {
      // Clear activeConversationId only when mounting /chat fresh or navigating from an ID to /chat
      // This avoids clearing it if the store just updated it internally (e.g., via sendMessage)
      if (isFirst || prevConversationId.current) {
        useChatStore.setState({ activeConversationId: null });
      }
    }

    prevConversationId.current = conversationId;
  }, [conversationId, selectConversation]);

  // ── Hydration safe ───────────────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleNewThread = useCallback(async () => {
    useChatStore.setState({ activeConversationId: null });
    router.push("/chat");
  }, [router]);

  const handleSelectThread = useCallback(
    (threadId: string) => {
      if (threadId === "new") {
        handleNewThread();
      } else {
        router.push(`/chat/${threadId}`);
      }
    },
    [router, handleNewThread]
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      await deleteConversation(threadId);
      // If we deleted the active one, go back to /chat
      if (activeConversationId === threadId) {
        router.push("/chat");
      }
    },
    [deleteConversation, activeConversationId, router]
  );

  const handleDeleteAllChats = useCallback(async () => {
    // Delete all conversations one by one
    const ids = conversations.map((c) => c.id);
    for (const id of ids) {
      await deleteConversation(id);
    }
    router.push("/chat");
  }, [conversations, deleteConversation, router]);

  const handleLogout = useCallback(async () => {
    resetChatStore();
    await logout();
  }, [logout, resetChatStore]);

  const handleNavigateToDashboard = useCallback(
    (view: string) => {
      router.push(`/dashboard?view=${view}`);
    },
    [router]
  );

  // ── Sidebar threads ────────────────────────────────────────────────────
  const threads = useMemo(
    () =>
      conversations.map((c) => ({
        id: c.id,
        title: c.title || "New Chat",
        isActive: c.id === activeConversationId,
      })),
    [conversations, activeConversationId]
  );

  const sidebarUser = useMemo(
    () => ({
      name: user?.name || user?.username || "User",
      email: user?.email || "",
      avatar: user?.avatar_url || undefined,
    }),
    [user]
  );

  if (!isMounted) {
    return <div className="flex h-dvh w-full bg-background" />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full ">
        <Suspense fallback={<div className="flex h-dvh" />}>
          <Sidebar
            threads={threads}
            isLoading={isLoadingConversations}
            activeThreadId={activeConversationId ?? undefined}
            onNewThread={handleNewThread}
            onSelectThread={handleSelectThread}
            onDeleteThread={handleDeleteThread}
            onDeleteAllChats={handleDeleteAllChats}
            user={sidebarUser}
            onLogout={handleLogout}
            onNavigateToDashboard={handleNavigateToDashboard}
          />
        </Suspense>
        <SidebarInset>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};