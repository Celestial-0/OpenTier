import { useChatStore } from "@/store/chat-store";
import {
    useExternalStoreRuntime,
    ThreadMessage,
    AppendMessage,
} from "@assistant-ui/react";
import { useMemo, useEffect } from "react";
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
        error,
    } = useChatStore();

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];

    const threadMessages = useMemo((): ThreadMessage[] => {
        return currentMessages.map((msg): ThreadMessage => {
            let content = msg.content;

            // Append RAG sources if available
            if (msg.sources && msg.sources.length > 0) {
                const sourcesText = msg.sources
                    .map((s, i) => `[${i + 1}] ${s.document_title || "Source"} (${Math.round(s.relevance_score * 100)}%)`)
                    .join("\n");
                content += `\n\n**Sources:**\n${sourcesText}`;
            }

            return {
                id: msg.id,
                role: msg.role as "user" | "assistant" | "system",
                content: [{ type: "text", text: content }],
            };
        });
    }, [currentMessages]);

    const runtime = useExternalStoreRuntime({
        isRunning: isSendingMessage,
        messages: threadMessages,
        onNew: async (msg: AppendMessage) => {
            const textContent = msg.content
                .filter(c => c.type === "text")
                .map(c => (c as any).text)
                .join("\n");

            if (textContent) {
                await sendMessage(textContent);
            }
        },
        onCancel: async () => {
            stopGeneration();
        },
        threads: useMemo(() => conversations.map(c => ({
            id: c.id,
            title: c.title || "New Chat",
        })), [conversations]),
        onSwitchToThread: async (threadId) => {
            await selectConversation(threadId);
        },
        onNewThread: async () => {
            await createNewConversation();
        },
    });

    return runtime;
};
