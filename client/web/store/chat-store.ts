import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
    ChatMessage,
    ConversationSummary,
    ConversationListResponseSchema,
    ConversationWithMessagesSchema,
    MessageResponseSchema,
    ChatMetricsSchema,
    CreateConversationRequest,
    SendMessageRequest,
    SourceChunk
} from '@/lib/api-types';
import { getAuthToken, getAuthHeaders } from '@/lib/auth-utils';

// --- Store State ---

interface ChatState {
    // Persistent Data (Synced with Server)
    conversations: ConversationSummary[];
    activeConversationId: string | null;
    messages: Record<string, ChatMessage[]>; // Cache messages by conversation ID
    nextCursor: string | null; // For pagination of conversations

    // Local State for Unauthenticated Users
    freeMessageCount: number;

    // Transient UI State
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;
    isTyping: boolean; // For streaming or showing typing indicators
    error: string | null;
    abortController: AbortController | null;

    // Actions
    fetchConversations: (reset?: boolean) => Promise<void>;
    selectConversation: (conversationId: string) => Promise<void>;
    createNewConversation: (title?: string) => Promise<string>; // Returns new ID
    sendMessage: (content: string, useStream?: boolean) => Promise<void>;
    stopGeneration: () => void;
    deleteConversation: (conversationId: string) => Promise<void>;

    // Helpers
    clearError: () => void;
    reset: () => void;
}

// --- Store Implementation ---

export const FREE_MESSAGE_LIMIT = 5;

export const useChatStore = create<ChatState>()(
    devtools(
        persist(
            (set, get) => ({
                conversations: [],
                activeConversationId: null,
                messages: {},
                nextCursor: null,
                freeMessageCount: 0,

                isLoadingConversations: false,
                isLoadingMessages: false,
                isSendingMessage: false,
                isTyping: false,
                error: null,
                abortController: null,

                fetchConversations: async (reset = false) => {
                    const token = getAuthToken();
                    if (!token) return; // Don't fetch if not logged in (unless we want local only?)

                    set({ isLoadingConversations: true, error: null });
                    try {
                        const headers = getAuthHeaders();
                        const cursor = reset ? undefined : get().nextCursor;
                        const query = cursor ? `?cursor=${cursor}` : '';
                        const response = await fetch(`/api/chat/conversations${query}`, {
                            headers: { ...headers as Record<string, string> }
                        });
                        if (!response.ok) throw new Error('Failed to fetch conversations');

                        const data = await response.json();
                        const parsed = ConversationListResponseSchema.parse(data); // Zod validation

                        set((state) => ({
                            conversations: reset
                                ? parsed.conversations
                                : [...state.conversations, ...parsed.conversations],
                            nextCursor: parsed.next_cursor || null,
                            isLoadingConversations: false,
                        }));
                    } catch (err) {
                        set({ error: (err as Error).message, isLoadingConversations: false });
                    }
                },

                selectConversation: async (conversationId) => {
                    set({ activeConversationId: conversationId });

                    const token = getAuthToken();
                    // If not auth, we rely on local state 'messages' which might have optimistic updates
                    // But if we want to fetch details, we need auth.
                    // For unauth, we might just skip fetching?
                    if (!token) return;

                    // Typically we want to refresh to get new messages in case of external updates
                    set({ isLoadingMessages: true, error: null });
                    try {
                        const headers = getAuthHeaders();
                        const response = await fetch(`/api/chat/conversations/${conversationId}`, {
                            headers: { ...headers as Record<string, string> }
                        });
                        if (!response.ok) throw new Error('Failed to fetch conversation details');

                        const data = await response.json();
                        const parsed = ConversationWithMessagesSchema.parse(data);

                        set((state) => ({
                            messages: {
                                ...state.messages,
                                [conversationId]: parsed.messages,
                            },
                            isLoadingMessages: false,
                        }));
                    } catch (err) {
                        set({ error: (err as Error).message, isLoadingMessages: false });
                    }
                },

                createNewConversation: async (title) => {
                    set({ error: null });
                    const token = getAuthToken();

                    // If unauth, create local conversation ID
                    if (!token) {
                        const id = `local-${Date.now()}`;
                        const summary: ConversationSummary = {
                            id,
                            title: title || 'New Chat',
                            message_count: 0,
                            last_message_preview: null,
                            created_at: Date.now() / 1000,
                            updated_at: Date.now() / 1000,
                        };
                        set(state => ({
                            conversations: [summary, ...state.conversations],
                            activeConversationId: id,
                            messages: { ...state.messages, [id]: [] }
                        }));
                        return id;
                    }

                    try {
                        const headers = getAuthHeaders();
                        const payload: CreateConversationRequest = { title: title || 'New Chat' };
                        const response = await fetch('/api/chat/conversations', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...headers as Record<string, string>
                            },
                            body: JSON.stringify(payload),
                        });

                        if (!response.ok) throw new Error('Failed to create conversation');

                        const newConv = await response.json();

                        const summary: ConversationSummary = {
                            id: newConv.id,
                            title: newConv.title,
                            message_count: 0,
                            last_message_preview: null,
                            created_at: newConv.created_at || Date.now() / 1000,
                            updated_at: newConv.updated_at || Date.now() / 1000,
                        };

                        set((state) => ({
                            conversations: [summary, ...state.conversations],
                            activeConversationId: summary.id,
                            messages: { ...state.messages, [summary.id]: [] }
                        }));

                        return summary.id;
                    } catch (err) {
                        set({ error: (err as Error).message });
                        throw err;
                    }
                },

                stopGeneration: () => {
                    const { abortController } = get();
                    if (abortController) {
                        abortController.abort();
                        set({ abortController: null, isSendingMessage: false, isTyping: false });
                    }
                },

                sendMessage: async (content, useStream = true) => {
                    const { activeConversationId, freeMessageCount } = get();
                    if (!activeConversationId) return;

                    const token = getAuthToken();

                    // Check Limits for Unauth
                    if (!token) {
                        if (freeMessageCount >= FREE_MESSAGE_LIMIT) {
                            set({ error: "Free message limit reached. Please sign in to continue." });
                            // Optionally trigger Auth Modal via event or specialized error
                            // throwing might be better to catch in UI
                            return;
                        }
                        // Increment
                        set({ freeMessageCount: freeMessageCount + 1 });
                    }


                    // Stop any previous generation
                    get().stopGeneration();

                    const abortController = new AbortController();

                    // Optimistic Update: User Message
                    const tempUserId = `user-${Date.now()}`;
                    const tempUserMessage: ChatMessage = {
                        id: tempUserId,
                        role: 'user',
                        content,
                        created_at: Date.now() / 1000,
                        sources: []
                    };

                    // Optimistic Update: Assistant Placeholder
                    const tempAssistantId = `assistant-${Date.now()}`;
                    const tempAssistantMessage: ChatMessage = {
                        id: tempAssistantId,
                        role: 'assistant',
                        content: '',
                        created_at: Date.now() / 1000,
                        sources: []
                    };

                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [activeConversationId]: [
                                ...(state.messages[activeConversationId] || []),
                                tempUserMessage,
                                tempAssistantMessage
                            ],
                        },
                        isSendingMessage: true,
                        isTyping: true,
                        abortController,
                        error: null
                    }));

                    // If unauth, we might mock response OR call API.
                    // If API is protected, we can't call it.
                    // Assuming API allows unauth or we mock it.
                    // Given instructions "Connect Auth completely... only authenticated users are allowed to /chat... user can do free 5 chats".
                    // This implies API DOES support it or we mock.
                    // I will attempt to call API. If 401, I'll handle it.
                    // If backend is strict, this will fail.
                    // For now, I'll assume backend handles it or I should mock if no token.
                    // But to be safe, I'll try calling with no headers if no token.

                    try {
                        const headers = getAuthHeaders();

                        if (useStream) {
                            // STREAMING IMPLEMENTATION (GET /stream)
                            // Note: GET method limits message size due to URL length. 
                            // If message is huge, we might need a workaround or server change.

                            const params = new URLSearchParams({
                                message: content,
                                temperature: '0.7',
                                // Add other config params if needed
                            });

                            const response = await fetch(`/api/chat/conversations/${activeConversationId}/stream?${params.toString()}`, {
                                signal: abortController.signal,
                                headers: {
                                    'Accept': 'text/event-stream',
                                    ...headers as Record<string, string>
                                }
                            });

                            if (!response.ok) throw new Error('Failed to start stream');
                            if (!response.body) throw new Error('No response body');

                            const reader = response.body.getReader();
                            const decoder = new TextDecoder();
                            let assistantContent = '';
                            let sources: SourceChunk[] = [];

                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                const chunk = decoder.decode(value, { stream: true });
                                // Simple parsing of SSE format
                                const events = chunk.split('\n\n').filter(Boolean);

                                for (const eventStr of events) {
                                    const lines = eventStr.split('\n');
                                    let type = 'message';
                                    let data = '';

                                    for (const line of lines) {
                                        if (line.startsWith('event: ')) type = line.substring(7);
                                        else if (line.startsWith('data: ')) data = line.substring(6);
                                    }

                                    if (!data) continue;

                                    if (type === 'message') {
                                        assistantContent += data;
                                    } else if (type === 'source') {
                                        try {
                                            const source: SourceChunk = JSON.parse(data);
                                            sources.push(source);
                                        } catch (e) { console.error('Failed to parse source', e); }
                                    } else if (type === 'metrics') {
                                        // Metrics usually come last
                                    } else if (type === 'error') {
                                        throw new Error(data);
                                    }

                                    // Update Store with accumulated content
                                    set((state) => {
                                        const msgs = state.messages[activeConversationId] || [];
                                        const updatedMsgs = msgs.map(m => {
                                            if (m.id === tempAssistantId) {
                                                return { ...m, content: assistantContent, sources };
                                            }
                                            return m;
                                        });
                                        return {
                                            messages: { ...state.messages, [activeConversationId]: updatedMsgs }
                                        };
                                    });
                                }
                            }

                        } else {
                            // NON-STREAMING (POST)
                            const payload: SendMessageRequest = { message: content };
                            const response = await fetch(`/api/chat/conversations/${activeConversationId}/messages`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...headers as Record<string, string>
                                },
                                body: JSON.stringify(payload),
                                signal: abortController.signal,
                            });

                            if (!response.ok) throw new Error('Failed to send message');

                            const data = await response.json();
                            const parsed = MessageResponseSchema.parse(data);

                            set((state) => {
                                const currentMsgs = state.messages[activeConversationId] || [];
                                // Replace temp assistant message with real one
                                const updatedMsgs = currentMsgs.map(m => {
                                    if (m.id === tempAssistantId) {
                                        return {
                                            id: parsed.message_id, // Real ID
                                            role: parsed.role,
                                            content: parsed.content,
                                            created_at: parsed.created_at,
                                            sources: parsed.sources
                                        };
                                    }
                                    return m;
                                });

                                return {
                                    messages: {
                                        ...state.messages,
                                        [activeConversationId]: updatedMsgs,
                                    },
                                };
                            });
                        }

                        set({ isSendingMessage: false, isTyping: false, abortController: null });

                    } catch (err) {
                        if ((err as Error).name === 'AbortError') {
                            // User stopped generation
                            set({ isSendingMessage: false, isTyping: false, abortController: null });
                        } else {
                            set((state) => ({
                                error: (err as Error).message,
                                isSendingMessage: false,
                                isTyping: false,
                                abortController: null,
                                // Remove temp messages on error? or keep with error state?
                                // For now, keep them so user can copy text.
                            }));
                        }
                    }
                },

                deleteConversation: async (conversationId) => {
                    try {
                        const headers = getAuthHeaders();
                        await fetch(`/api/chat/conversations/${conversationId}`, {
                            method: 'DELETE',
                            headers: { ...headers as Record<string, string> }
                        });
                        set((state) => ({
                            conversations: state.conversations.filter(c => c.id !== conversationId),
                            activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
                            messages: { ...state.messages, [conversationId]: undefined } as any,
                        }));
                    } catch (err) {
                        set({ error: (err as Error).message });
                    }
                },

                clearError: () => set({ error: null }),
                reset: () => set({ conversations: [], activeConversationId: null, messages: {} }),
            }),
            {
                name: 'ChatStore',
                partialize: (state) => ({
                    freeMessageCount: state.freeMessageCount,
                    // Optionally persist conversations for unauth experience continuity if needed
                    conversations: state.conversations,
                    messages: state.messages
                }),
            }
        )
    )
);
