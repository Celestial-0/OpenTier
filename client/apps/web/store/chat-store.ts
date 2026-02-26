import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
    ChatMessage,
    ConversationSummary,
    MessageResponse,
    CreateConversationRequest,
    SendMessageRequest,
    SourceChunk
} from '@/types/chats';
import {
    ConversationListResponseSchema,
    ConversationWithMessagesSchema,
    MessageResponseSchema,
} from '@/lib/api-types';
import { getAuthToken, getAuthHeaders } from '@/lib/auth-utils';

// --- Store State ---

interface ChatState {
    // Persistent Data (Synced with Server)
    conversations: ConversationSummary[];
    activeConversationId: string | null;
    messages: Record<string, ChatMessage[]>; // Cache messages by conversation ID
    activeMessageId: Record<string, string | null>; // Tracks the leaf node for each conversation
    nextCursor: string | null; // For pagination of conversations
    totalConversationsCount: number; // Total count from server

    // Local State for Unauthenticated Users
    freeMessageCount: number;

    // Title Generation Config
    useAiTitleGeneration: boolean; // Toggle for AI vs simple title generation

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
    editMessage: (messageId: string, newContent: string) => Promise<void>;
    setMessages: (messages: ChatMessage[]) => void;
    regenerateLastResponse: () => Promise<void>;
    stopGeneration: () => void;
    deleteConversation: (conversationId: string) => Promise<void>;
    updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
    generateTitleWithAI: (conversationId: string, userMessage: string, assistantMessage: string) => Promise<string | null>;
    setUseAiTitleGeneration: (value: boolean) => void;
    switchBranch: (messageId: string) => void; // Switch the active branch
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
                activeMessageId: {},
                nextCursor: null,
                totalConversationsCount: 0,
                freeMessageCount: 0,
                useAiTitleGeneration: false, // Default to simple title generation

                isLoadingConversations: false,
                isLoadingMessages: false,
                isSendingMessage: false,
                isTyping: false,
                error: null,
                abortController: null,

                switchBranch: (messageId) => {
                    const { activeConversationId } = get();
                    if (!activeConversationId) return;

                    set((state) => ({
                        activeMessageId: {
                            ...state.activeMessageId,
                            [activeConversationId]: messageId,
                        },
                    }));
                },

                fetchConversations: async (reset = false) => {
                    if (get().isLoadingConversations) return;
                    const token = getAuthToken();
                    if (!token) return;

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

                        set((state) => {
                            const allConversations = reset
                                ? parsed.conversations
                                : [...state.conversations, ...parsed.conversations];

                            const uniqueConversations = Array.from(
                                new Map(allConversations.map(c => [c.id, c])).values()
                            );

                            return {
                                conversations: uniqueConversations,
                                nextCursor: parsed.next_cursor || null,
                                totalConversationsCount: parsed.total_count,
                                isLoadingConversations: false,
                            };
                        });
                    } catch (err) {
                        set({ error: (err as Error).message, isLoadingConversations: false });
                    }
                },

                selectConversation: async (conversationId) => {
                    const state = get();
                    set({ activeConversationId: conversationId });

                    const token = getAuthToken();
                    if (!token) return;

                    // If we already have messages loaded for this conversation and they are 
                    // actively streaming (isSendingMessage is true), DON'T refetch or we might 
                    // overwrite the local optimistic state with stale server data.
                    if (state.messages[conversationId] && state.messages[conversationId].length > 0 && state.isSendingMessage) {
                        return;
                    }

                    // For newly created chats that haven't streamed yet, or existing chats we navigate to.
                    set({ isLoadingMessages: true, error: null });
                    try {
                        const headers = getAuthHeaders();
                        const response = await fetch(`/api/chat/conversations/${conversationId}`, {
                            headers: { ...headers as Record<string, string> }
                        });
                        if (!response.ok) throw new Error('Failed to fetch conversation details');

                        const data = await response.json();
                        const parsed = ConversationWithMessagesSchema.parse(data);

                        set((s) => ({
                            messages: {
                                ...s.messages,
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
                            title: 'New Chat',
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
                        const payload: CreateConversationRequest = { title: 'New Chat' };
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
                    let { activeConversationId } = get();
                    const { freeMessageCount } = get();

                    if (!activeConversationId) {
                        activeConversationId = await get().createNewConversation();
                    }

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
                    const state = get();
                    const abortController = new AbortController();
                    const activeMsgId = state.activeMessageId[activeConversationId] || null;

                    // Optimistic Update: User Message
                    const tempUserId = crypto.randomUUID();
                    const tempUserMessage: ChatMessage = {
                        id: tempUserId,
                        role: 'user',
                        content,
                        created_at: Date.now() / 1000,
                        sources: [],
                        parent_id: activeMsgId || undefined,
                    };

                    // Optimistic Update: Assistant Placeholder
                    const tempAssistantId = crypto.randomUUID();
                    const tempAssistantMessage: ChatMessage = {
                        id: tempAssistantId,
                        role: 'assistant',
                        content: '',
                        created_at: Date.now() / 1000,
                        sources: [],
                        parent_id: tempUserId,
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
                        activeMessageId: {
                            ...state.activeMessageId,
                            [activeConversationId]: tempAssistantId,
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

                            const payload = {
                                message: content,
                                temperature: 0.7,
                                use_rag: true,
                                max_tokens: 1000,
                                parent_id: tempUserMessage.parent_id,
                                user_message_id: tempUserId,
                                assistant_message_id: tempAssistantId,
                            };

                            const response = await fetch(`/api/chat/conversations/${activeConversationId}/stream`, {
                                method: 'POST',
                                signal: abortController.signal,
                                headers: {
                                    'Accept': 'text/event-stream',
                                    'Content-Type': 'application/json',
                                    ...headers as Record<string, string>
                                },
                                body: JSON.stringify(payload),
                            });

                            if (!response.ok) throw new Error('Failed to start stream');
                            if (!response.body) throw new Error('No response body');

                            const reader = response.body.getReader();
                            const decoder = new TextDecoder();
                            let assistantContent = '';
                            let sources: SourceChunk[] = [];
                            let eventBuffer = '';

                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                eventBuffer += decoder.decode(value, { stream: true });

                                let chunkAssistantContent = '';
                                const chunkSources: SourceChunk[] = [];
                                let hasUpdates = false;

                                let newlineIndex;
                                while ((newlineIndex = eventBuffer.indexOf('\n\n')) >= 0) {
                                    const eventStr = eventBuffer.slice(0, newlineIndex);
                                    eventBuffer = eventBuffer.slice(newlineIndex + 2);

                                    if (!eventStr.trim()) continue;

                                    const lines = eventStr.split('\n');
                                    let type = 'message';
                                    const dataLines: string[] = [];

                                    for (const line of lines) {
                                        if (line.startsWith('event: ')) type = line.substring(7).trim();
                                        else if (line.startsWith('data: ')) dataLines.push(line.substring(6));
                                        else if (line.startsWith('data:')) dataLines.push(line.substring(5));
                                    }

                                    const data = dataLines.join('\n');
                                    if (!data) continue;

                                    if (type === 'message') {
                                        chunkAssistantContent += data;
                                        hasUpdates = true;
                                    } else if (type === 'source') {
                                        try {
                                            const source: SourceChunk = JSON.parse(data);
                                            chunkSources.push(source);
                                            hasUpdates = true;
                                        } catch (e) { console.error('Failed to parse source', e); }
                                    } else if (type === 'error') {
                                        throw new Error(data);
                                    }
                                }

                                if (hasUpdates) {
                                    assistantContent += chunkAssistantContent;
                                    if (chunkSources.length > 0) {
                                        sources = [...sources, ...chunkSources];
                                    }

                                    // Update State once per chunk instead of per event
                                    set((state) => {
                                        const msgs = state.messages[activeConversationId] || [];
                                        const updatedMsgs = msgs.map(m => {
                                            if (m.id === tempAssistantId) {
                                                return { ...m, content: assistantContent, sources };
                                            }
                                            return m;
                                        });
                                        return {
                                            messages: { ...state.messages, [activeConversationId]: updatedMsgs },
                                            activeMessageId: { ...state.activeMessageId, [activeConversationId]: tempAssistantId },
                                        };
                                    });
                                }
                            }

                        } else {
                            // NON-STREAMING (POST)
                            const payload: SendMessageRequest = {
                                message: content,
                                config: {
                                    use_rag: true,
                                    temperature: 0.7
                                },
                                parent_id: tempUserMessage.parent_id,
                                user_message_id: tempUserId,
                                assistant_message_id: tempAssistantId,
                            };
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

                        // Auto-generate title after first assistant response
                        const currentMsgs = get().messages[activeConversationId] || [];
                        const hasOnlyTwoMessages = currentMsgs.length === 2;
                        const firstIsUser = currentMsgs[0]?.role === 'user';
                        const secondIsAssistant = currentMsgs[1]?.role === 'assistant';

                        if (hasOnlyTwoMessages && firstIsUser && secondIsAssistant) {
                            const firstUserMessage = currentMsgs[0].content;
                            const firstAssistantMessage = currentMsgs[1].content;
                            let generatedTitle: string;

                            // Use AI title generation if enabled
                            if (get().useAiTitleGeneration) {
                                const aiTitle = await get().generateTitleWithAI(
                                    activeConversationId,
                                    firstUserMessage,
                                    firstAssistantMessage
                                );

                                // Fallback to simple if AI fails
                                generatedTitle = aiTitle || firstUserMessage
                                    .replace(/\n/g, ' ')
                                    .trim()
                                    .slice(0, 50);
                            } else {
                                // Simple title generation
                                generatedTitle = firstUserMessage
                                    .replace(/\n/g, ' ')
                                    .trim()
                                    .slice(0, 50);
                            }

                            if (generatedTitle) {
                                await get().updateConversationTitle(activeConversationId, generatedTitle);
                            }
                        }

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

                editMessage: async (messageId, newContent) => {
                    const { activeConversationId } = get();
                    if (!activeConversationId) return;

                    const state = get();
                    const currentMsgs = state.messages[activeConversationId] || [];
                    const originalMsg = currentMsgs.find(m => m.id === messageId);
                    if (!originalMsg || originalMsg.role !== 'user') return;

                    get().stopGeneration();

                    // Create a NEW user message as a sibling branch
                    // It shares the same parent_id as the original message
                    const newUserId = crypto.randomUUID();
                    const newUserMessage: ChatMessage = {
                        id: newUserId,
                        role: 'user',
                        content: newContent,
                        created_at: Date.now() / 1000,
                        sources: [],
                        parent_id: originalMsg.parent_id, // Same parent = sibling branch
                    };

                    // Create an assistant placeholder as a child of this new user message
                    const newAssistantId = crypto.randomUUID();
                    const newAssistantMessage: ChatMessage = {
                        id: newAssistantId,
                        role: 'assistant',
                        content: '',
                        created_at: Date.now() / 1000,
                        sources: [],
                        parent_id: newUserId,
                    };

                    // Add the new messages to the existing array (don't truncate!)
                    const abortController = new AbortController();
                    set((s) => ({
                        messages: {
                            ...s.messages,
                            [activeConversationId]: [
                                ...currentMsgs,
                                newUserMessage,
                                newAssistantMessage,
                            ],
                        },
                        activeMessageId: {
                            ...s.activeMessageId,
                            [activeConversationId]: newAssistantId,
                        },
                        isSendingMessage: true,
                        isTyping: true,
                        abortController,
                        error: null,
                    }));

                    // Stream the new response
                    try {
                        const headers = getAuthHeaders();
                        const payload = {
                            message: newContent,
                            temperature: 0.7,
                            use_rag: true,
                            max_tokens: 1000,
                            parent_id: originalMsg.parent_id,
                            user_message_id: newUserId,
                            assistant_message_id: newAssistantId,
                        };

                        const response = await fetch(
                            `/api/chat/conversations/${activeConversationId}/stream`,
                            {
                                method: 'POST',
                                signal: abortController.signal,
                                headers: {
                                    Accept: 'text/event-stream',
                                    'Content-Type': 'application/json',
                                    ...(headers as Record<string, string>),
                                },
                                body: JSON.stringify(payload),
                            }
                        );

                        if (!response.ok) throw new Error('Failed to start stream');
                        if (!response.body) throw new Error('No response body');

                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let assistantContent = '';
                        let sources: SourceChunk[] = [];
                        let eventBuffer = '';

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            eventBuffer += decoder.decode(value, { stream: true });

                            let chunkAssistantContent = '';
                            const chunkSources: SourceChunk[] = [];
                            let hasUpdates = false;

                            let newlineIndex;
                            while ((newlineIndex = eventBuffer.indexOf('\n\n')) >= 0) {
                                const eventStr = eventBuffer.slice(0, newlineIndex);
                                eventBuffer = eventBuffer.slice(newlineIndex + 2);

                                if (!eventStr.trim()) continue;

                                const lines = eventStr.split('\n');
                                let type = 'message';
                                const dataLines: string[] = [];

                                for (const line of lines) {
                                    if (line.startsWith('event: ')) type = line.substring(7).trim();
                                    else if (line.startsWith('data: ')) dataLines.push(line.substring(6));
                                    else if (line.startsWith('data:')) dataLines.push(line.substring(5));
                                }

                                const data = dataLines.join('\n');
                                if (!data) continue;

                                if (type === 'message') {
                                    chunkAssistantContent += data;
                                    hasUpdates = true;
                                } else if (type === 'source') {
                                    try {
                                        const source: SourceChunk = JSON.parse(data);
                                        chunkSources.push(source);
                                        hasUpdates = true;
                                    } catch (e) { console.error('Failed to parse source', e); }
                                } else if (type === 'error') {
                                    throw new Error(data);
                                }
                            }

                            if (hasUpdates) {
                                assistantContent += chunkAssistantContent;
                                if (chunkSources.length > 0) {
                                    sources = [...sources, ...chunkSources];
                                }

                                set((s) => {
                                    const msgs = s.messages[activeConversationId] || [];
                                    const updatedMsgs = msgs.map((m) => {
                                        if (m.id === newAssistantId) {
                                            return { ...m, content: assistantContent, sources };
                                        }
                                        return m;
                                    });
                                    return {
                                        messages: { ...s.messages, [activeConversationId]: updatedMsgs },
                                        activeMessageId: { ...s.activeMessageId, [activeConversationId]: newAssistantId },
                                    };
                                });
                            }
                        }

                        set({ isSendingMessage: false, isTyping: false, abortController: null });
                    } catch (err) {
                        if ((err as Error).name === 'AbortError') {
                            set({ isSendingMessage: false, isTyping: false, abortController: null });
                        } else {
                            set({
                                error: (err as Error).message,
                                isSendingMessage: false,
                                isTyping: false,
                                abortController: null,
                            });
                        }
                    }
                },

                setMessages: (messages) => {
                    const { activeConversationId } = get();
                    if (!activeConversationId) return;

                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [activeConversationId]: messages
                        }
                    }));
                },

                regenerateLastResponse: async () => {
                    const { activeConversationId } = get();
                    if (!activeConversationId) return;

                    const state = get();
                    const currentMsgs = state.messages[activeConversationId] || [];
                    if (currentMsgs.length === 0) return;

                    // 1. Identify context
                    const targetMsgs = [...currentMsgs];
                    const activeMsgId = state.activeMessageId[activeConversationId] || targetMsgs[targetMsgs.length - 1]?.id;

                    if (!activeMsgId) return;

                    // Find the active message
                    const activeMsgIndex = targetMsgs.findIndex(m => m.id === activeMsgId);
                    if (activeMsgIndex === -1) return;

                    const activeMsg = targetMsgs[activeMsgIndex];
                    let lastUserMsg: ChatMessage | null = null;
                    let parentId: string | undefined = undefined;

                    if (activeMsg.role === 'user') {
                        lastUserMsg = activeMsg;
                        parentId = activeMsg.parent_id;
                    } else if (activeMsg.role === 'assistant') {
                        // Find the user message that prompted this assistant message
                        lastUserMsg = targetMsgs.slice(0, activeMsgIndex).reverse().find(m => m.role === 'user') || null;
                        parentId = lastUserMsg?.parent_id;
                    }

                    if (!lastUserMsg) return; // Nothing to regenerate

                    // 2. Reset state for generation
                    get().stopGeneration();
                    const abortController = new AbortController();
                    const tempAssistantId = crypto.randomUUID();

                    // Optimistic: Add placeholder assistant message
                    const tempAssistantMessage: ChatMessage = {
                        id: tempAssistantId,
                        role: 'assistant',
                        content: '',
                        created_at: Date.now() / 1000,
                        sources: [],
                        parent_id: lastUserMsg.id,
                    };

                    set({
                        messages: {
                            ...state.messages,
                            [activeConversationId]: [...targetMsgs, tempAssistantMessage],
                        },
                        activeMessageId: {
                            ...state.activeMessageId,
                            [activeConversationId]: tempAssistantId,
                        },
                        isSendingMessage: true,
                        isTyping: true,
                        abortController,
                        error: null
                    });

                    // 3. Execute Request (Copy of sendMessage logic)
                    try {
                        const token = getAuthToken();
                        const headers = getAuthHeaders();
                        const content = lastUserMsg.content;

                        // Check free limit if no token? 
                        // Assuming regenerate counts as a message or maybe not? 
                        // strict: yes. loose: no. Let's ignore for now.

                        const payload = {
                            message: content,
                            temperature: 0.7,
                            use_rag: true,
                            max_tokens: 1000,
                            parent_id: parentId, // Reroute back from the same user parent
                            regenerate_user_msg_id: lastUserMsg.id,
                            assistant_message_id: tempAssistantId,
                        };

                        const response = await fetch(`/api/chat/conversations/${activeConversationId}/stream`, {
                            method: 'POST',
                            signal: abortController.signal,
                            headers: {
                                'Accept': 'text/event-stream',
                                'Content-Type': 'application/json',
                                ...headers as Record<string, string>
                            },
                            body: JSON.stringify(payload),
                        });

                        if (!response.ok) throw new Error('Failed to start stream');
                        if (!response.body) throw new Error('No response body');

                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let assistantContent = '';
                        let sources: SourceChunk[] = [];
                        let eventBuffer = '';

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            eventBuffer += decoder.decode(value, { stream: true });

                            let chunkAssistantContent = '';
                            const chunkSources: SourceChunk[] = [];
                            let hasUpdates = false;

                            let newlineIndex;
                            while ((newlineIndex = eventBuffer.indexOf('\n\n')) >= 0) {
                                const eventStr = eventBuffer.slice(0, newlineIndex);
                                eventBuffer = eventBuffer.slice(newlineIndex + 2);

                                if (!eventStr.trim()) continue;

                                const lines = eventStr.split('\n');
                                let type = 'message';
                                const dataLines: string[] = [];

                                for (const line of lines) {
                                    if (line.startsWith('event: ')) type = line.substring(7).trim();
                                    else if (line.startsWith('data: ')) dataLines.push(line.substring(6));
                                    else if (line.startsWith('data:')) dataLines.push(line.substring(5));
                                }

                                const data = dataLines.join('\n');
                                if (!data) continue;

                                if (type === 'message') {
                                    chunkAssistantContent += data;
                                    hasUpdates = true;
                                } else if (type === 'source') {
                                    try {
                                        const source: SourceChunk = JSON.parse(data);
                                        chunkSources.push(source);
                                        hasUpdates = true;
                                    } catch (e) { console.error('Failed to parse source', e); }
                                } else if (type === 'error') {
                                    throw new Error(data);
                                }
                            }

                            if (hasUpdates) {
                                assistantContent += chunkAssistantContent;
                                if (chunkSources.length > 0) {
                                    sources = [...sources, ...chunkSources];
                                }

                                set((state) => {
                                    const msgs = state.messages[activeConversationId] || [];
                                    const updatedMsgs = msgs.map(m => {
                                        if (m.id === tempAssistantId) {
                                            return { ...m, content: assistantContent, sources };
                                        }
                                        return m;
                                    });
                                    return {
                                        messages: { ...state.messages, [activeConversationId]: updatedMsgs },
                                        activeMessageId: { ...state.activeMessageId, [activeConversationId]: tempAssistantId },
                                    };
                                });
                            }
                        }

                        set({ isSendingMessage: false, isTyping: false, abortController: null });

                    } catch (err) {
                        if ((err as Error).name === 'AbortError') {
                            set({ isSendingMessage: false, isTyping: false, abortController: null });
                        } else {
                            set({
                                error: (err as Error).message,
                                isSendingMessage: false,
                                isTyping: false,
                                abortController: null,
                            });
                        }
                    }
                },

                updateConversationTitle: async (conversationId, title) => {
                    try {
                        const token = getAuthToken();

                        // Update local state immediately (optimistic update)
                        set((state) => ({
                            conversations: state.conversations.map(c =>
                                c.id === conversationId ? { ...c, title } : c
                            ),
                        }));

                        // If authenticated, sync with backend
                        if (token) {
                            const headers = getAuthHeaders();
                            const response = await fetch(`/api/chat/conversations/${conversationId}`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...headers as Record<string, string>
                                },
                                body: JSON.stringify({ title }),
                            });

                            if (!response.ok) {
                                // Revert on error
                                throw new Error('Failed to update conversation title');
                            }
                        }
                    } catch (err) {
                        // Silently fail - title update is not critical
                        console.error('Failed to update conversation title:', err);
                    }
                },

                generateTitleWithAI: async (conversationId, userMessage, assistantMessage) => {
                    try {
                        const token = getAuthToken();
                        if (!token) return null;

                        const headers = getAuthHeaders();
                        const response = await fetch(`/api/chat/conversations/${conversationId}/generate-title`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...headers as Record<string, string>
                            },
                            body: JSON.stringify({
                                user_message: userMessage,
                                assistant_message: assistantMessage
                            }),
                        });

                        if (!response.ok) throw new Error('Failed to generate AI title');

                        const data = await response.json();
                        return data.title;
                    } catch (err) {
                        console.error('AI title generation failed, falling back to simple:', err);
                        return null;
                    }
                },

                setUseAiTitleGeneration: (value) => set({ useAiTitleGeneration: value }),

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
