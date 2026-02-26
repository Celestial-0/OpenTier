"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ChatHeader } from "@/components/core/chat/chatarea/chat-header";
import { ChatInput, models } from "@/components/core/chat/chatarea/chat-input";
import {
  Messages,
  type MessageType,
} from "@/components/core/chat/chatarea/messages";

import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/types/chats";

// Stable empty array to avoid creating new references in selectors
const EMPTY_MESSAGES: ChatMessage[] = [];

// ─── ChatArea Component ──────────────────────────────────────────────────────

export const ChatArea = () => {
  const router = useRouter();

  // ── Store state ────────────────────────────────────────────────────────
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const allMessages = useChatStore((s) => s.messages);
  const allActiveMessageIds = useChatStore((s) => s.activeMessageId);
  const storeMessages = useMemo(
    () => (activeConversationId ? allMessages[activeConversationId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES),
    [activeConversationId, allMessages]
  );
  const currentActiveLeaf = useMemo(
    () => (activeConversationId ? allActiveMessageIds[activeConversationId] ?? null : null),
    [activeConversationId, allActiveMessageIds]
  );
  const isTyping = useChatStore((s) => s.isTyping);
  const isSendingMessage = useChatStore((s) => s.isSendingMessage);
  const error = useChatStore((s) => s.error);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const regenerateLastResponse = useChatStore((s) => s.regenerateLastResponse);
  const stopGeneration = useChatStore((s) => s.stopGeneration);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const switchBranch = useChatStore((s) => s.switchBranch);

  // ── Local UI state ─────────────────────────────────────────────────────
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);

  // ── Derived state ──────────────────────────────────────────────────────

  const messages: MessageType[] = useMemo(() => {
    if (!storeMessages.length) return [];

    // 1. Map messages by ID for quick access
    const msgMap = new Map<string, ChatMessage>();
    storeMessages.forEach(msg => msgMap.set(msg.id, msg));

    // 2. Group siblings by their parent_id
    const childrenByParent = new Map<string | undefined, ChatMessage[]>();
    storeMessages.forEach(msg => {
      const parentId = msg.parent_id;
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId)!.push(msg);
    });

    // 3. Find the active leaf node
    // If no active message is recorded, default to the very last message in the array
    const activeMsgId = currentActiveLeaf ||
      storeMessages[storeMessages.length - 1]?.id;

    if (!activeMsgId) return [];

    // 4. Trace the active lineage backwards from the leaf to the root
    const activeLineage: ChatMessage[] = [];
    let currentId: string | undefined = activeMsgId;

    // Prevent infinite loops in case of corrupted data
    const visited = new Set<string>();

    while (currentId && msgMap.has(currentId) && !visited.has(currentId)) {
      visited.add(currentId);
      const msg = msgMap.get(currentId)!;
      activeLineage.push(msg);

      // If the message has no explicit parent_id (e.g., old data), 
      // assume the message immediately preceding it in the store array is the parent.
      if (!msg.parent_id) {
        const idx = storeMessages.findIndex(m => m.id === currentId);
        currentId = idx > 0 ? storeMessages[idx - 1].id : undefined;
      } else {
        currentId = msg.parent_id;
      }
    }

    // Reverse to get chronological order (root to leaf)
    activeLineage.reverse();

    // 5. Build the UI MessageType array
    // For each message in the active lineage, we find all of its siblings 
    // (messages that share the same parent) and add them as versions.
    return activeLineage.map((activeMsg) => {
      // Find what the "parent" was for this level of the tree
      // For the root message, this might be undefined. 
      // For older messages without parent_id, we infer the parent as the previous message in the lineage.
      let parentIdForGroup = activeMsg.parent_id;
      if (!parentIdForGroup) {
        const idx = activeLineage.indexOf(activeMsg);
        parentIdForGroup = idx > 0 ? activeLineage[idx - 1].id : undefined;
      }

      // Get all siblings that share this parent
      const siblings = childrenByParent.get(activeMsg.parent_id) || [activeMsg];

      // If there are older messages without parent_ids, the childrenByParent map might not have caught them.
      // Ensure the activeMsg is always at least one of the versions.
      const versions = siblings.some(s => s.id === activeMsg.id) ? siblings : [...siblings, activeMsg];

      return {
        key: activeMsg.id, // The active branch's ID is the key for this group
        from: activeMsg.role as "user" | "assistant",
        versions: versions.map(v => ({ id: v.id, content: v.content })),
        sources: activeMsg.sources?.map((s) => ({
          id: s.chunk_id || s.document_id,
          href: s.source_url || "#",
          title: s.document_title || s.document_id || "Source",
        })),
      };
    });
  }, [storeMessages, activeConversationId, currentActiveLeaf]);

  // Determine the streaming message ID (active assistant message if streaming)
  const streamingMessageId = useMemo(() => {
    if (!isTyping || !activeConversationId) return null;
    if (!currentActiveLeaf) return null;
    const activeMsg = storeMessages.find(m => m.id === currentActiveLeaf);
    if (activeMsg?.role === 'assistant') return activeMsg.id;
    return null;
  }, [isTyping, storeMessages, activeConversationId, currentActiveLeaf]);

  // Map store status to UI status
  const status: "submitted" | "streaming" | "ready" | "error" = useMemo(() => {
    if (error) return "error";
    if (isTyping) return "streaming";
    if (isSendingMessage) return "submitted";
    return "ready";
  }, [error, isTyping, isSendingMessage]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRegenerate = useCallback(
    (_messageKey: string) => {
      if (isTyping || isSendingMessage) return;
      regenerateLastResponse();
    },
    [isTyping, isSendingMessage, regenerateLastResponse]
  );

  const handleEditMessage = useCallback(
    (messageKey: string, newContent: string) => {
      if (isTyping || isSendingMessage) return;
      editMessage(messageKey, newContent);
    },
    [isTyping, isSendingMessage, editMessage]
  );

  const handleSwitchBranch = useCallback(
    (versionId: string) => {
      switchBranch(versionId);
    },
    [switchBranch]
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      if (message.files?.length) {
        toast.success("Files attached", {
          description: `${message.files.length} file(s) attached to message`,
        });
      }

      const content = message.text || "Sent with attachments";
      setText("");

      // Fire sendMessage without awaiting — streaming happens in background.
      // The store updates (optimistic messages, streamed content) flow to
      // the UI reactively via Zustand selectors.
      const prevActiveId = activeConversationId;
      sendMessage(content).then(() => {
        // After streaming completes, navigate if a new conversation was created
        const newActiveId = useChatStore.getState().activeConversationId;
        if (newActiveId && newActiveId !== prevActiveId) {
          router.replace(`/chat/${newActiveId}`);
        }
      });
    },
    [sendMessage, activeConversationId, router]
  );

  const handleTranscriptionChange = useCallback((transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  }, []);

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    []
  );

  const toggleWebSearch = useCallback(() => {
    setUseWebSearch((prev) => !prev);
  }, []);

  const handleModelSelect = useCallback((modelId: string) => {
    setModel(modelId);
    setModelSelectorOpen(false);
  }, []);

  const isSubmitDisabled = useMemo(
    () => !text.trim() || status === "streaming" || status === "submitted",
    [text, status]
  );

  const isEmpty = messages.length === 0 && !isLoadingMessages;

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <ChatHeader />

      <Conversation>
        <ConversationContent className="w-full items-center">
          {isEmpty ? (
            <div className="flex size-full flex-col items-center justify-center gap-8 px-4">
              <div className="text-center">
                <h1 className="fade-in slide-in-from-bottom-1 animate-in font-semibold text-2xl duration-200">
                  Hello there!
                </h1>
                <p className="fade-in slide-in-from-bottom-1 animate-in text-muted-foreground text-xl delay-75 duration-200">
                  How can I help you today?
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-5xl px-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              ) : (
                <Messages
                  messages={messages}
                  streamingMessageId={streamingMessageId}
                  onRegenerate={handleRegenerate}
                  onEditMessage={handleEditMessage}
                  onSwitchBranch={handleSwitchBranch}
                />
              )}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <ChatInput
        text={text}
        status={status}
        model={model}
        modelSelectorOpen={modelSelectorOpen}
        useWebSearch={useWebSearch}
        isSubmitDisabled={isSubmitDisabled}
        onSubmit={handleSubmit}
        onTextChange={handleTextChange}
        onTranscriptionChange={handleTranscriptionChange}
        onToggleWebSearch={toggleWebSearch}
        onModelSelect={handleModelSelect}
        onModelSelectorOpenChange={setModelSelectorOpen}
      />
    </div>
  );
};