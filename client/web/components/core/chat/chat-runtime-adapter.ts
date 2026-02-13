import { useChatStore } from "@/store/chat-store";
import {
    useExternalStoreRuntime,
    ThreadMessage,
    AppendMessage,
} from "@assistant-ui/react";
import { useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";

export const useChatRuntimeAdapter = () => {
    const {
        messages,
        activeConversationId,
        conversations,
        sendMessage,
        isSendingMessage,
        stopGeneration,
        selectConversation,
        createNewConversation,
        fetchConversations,
        error,
        isLoadingMessages,
        deleteConversation,
        isLoadingConversations,
        regenerateLastResponse,
        editMessage,
        setMessages,
    } = useChatStore();

    // Track if initial fetch has happened to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchConversations(true);
        }
    }, []); // Empty dependency array - run once on mount

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];

    const threadMessages = useMemo((): ThreadMessage[] => {
        return currentMessages.map((msg, index): ThreadMessage => {
            const isLast = index === currentMessages.length - 1;
            const common = {
                id: msg.id,
                createdAt: new Date(msg.created_at * 1000),
            };

            if (msg.role === "user") {
                return {
                    ...common,
                    role: "user",
                    content: [{ type: "text", text: msg.content }],
                    attachments: [],
                    metadata: { custom: { sources: msg.sources } },
                };
            }

            if (msg.role === "assistant") {
                const isRunning = isLast && isSendingMessage;
                return {
                    ...common,
                    role: "assistant",
                    content: [{ type: "text", text: msg.content }],
                    status: isRunning
                        ? { type: "running" }
                        : { type: "complete", reason: "stop" },
                    metadata: {
                        custom: { sources: msg.sources },
                        steps: [],
                    },
                } as any;
            }

            // Fallback for system
            return {
                ...common,
                role: "system",
                content: [{ type: "text", text: msg.content }] as any,
                metadata: { custom: { sources: msg.sources } },
            };
        });
    }, [currentMessages, isSendingMessage]);

    const runtime = useExternalStoreRuntime({
        isRunning: isSendingMessage,
        isLoading: isLoadingMessages, // Indicate if messages are loading
        messages: threadMessages,
        onNew: async (msg: AppendMessage) => {
            const textContent = msg.content
                .filter(c => c.type === "text")
                .map(c => (c as any).text) // Type assertion might be needed if AppendMessage content is union
                .join("\n");

            if (textContent) {
                await sendMessage(textContent);
            }
        },
        onCancel: async () => {
            stopGeneration();
        },
        onReload: async () => {
            await regenerateLastResponse();
        },
        onEdit: async (msg) => {
            const textContent = msg.content
                .filter(c => c.type === "text")
                .map(c => (c as any).text)
                .join("\n");

            if (msg.sourceId && textContent) {
                await editMessage(msg.sourceId, textContent);
            }
        },
        setMessages: (messages: readonly ThreadMessage[]) => {
            const chatMessages = messages.map((m): any => {
                const textContent = m.content
                    .filter(c => c.type === "text")
                    .map(c => (c as any).text)
                    .join("\n");

                return {
                    id: m.id,
                    role: m.role,
                    content: textContent,
                    created_at: m.createdAt.getTime() / 1000,
                    sources: (m.metadata?.custom as any)?.sources || [],
                };
            });
            setMessages(chatMessages);
        },
        adapters: {
            threadList: {
                isLoading: isLoadingConversations, // Indicate if threads are loading
                threadId: activeConversationId || undefined,
                threads: conversations.map(c => ({
                    id: c.id,
                    title: c.title || "New Chat",
                    status: "regular" as const, // Cast to literal type
                })),
                onSwitchToThread: async (threadId: string) => {
                    await selectConversation(threadId);
                },
                onSwitchToNewThread: async () => {
                    await createNewConversation();
                },
                onArchive: async (threadId: string) => {
                    await deleteConversation(threadId);
                },
            },
        },
    });

    return runtime;
};
