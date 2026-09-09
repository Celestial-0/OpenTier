import { buildApiHeaders, resolveApiUrl } from '@/lib/api/base';

export type StreamChatPayload = {
    message: string;
    config?: {
        temperature?: number;
        max_tokens?: number;
        use_rag?: boolean;
        model?: string;
    };
    parent_id?: string;
    user_message_id?: string;
    assistant_message_id?: string;
    regenerate_user_msg_id?: string;
};

export async function fetchConversationsApi(cursor?: string): Promise<unknown> {
    const query = cursor ? `?cursor=${cursor}` : '';
    const response = await fetch(resolveApiUrl(`/chat/conversations${query}`), {
        headers: buildApiHeaders(undefined, false),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch conversations');
    }

    return response.json();
}

export async function fetchConversationDetailApi(conversationId: string): Promise<unknown> {
    const response = await fetch(resolveApiUrl(`/chat/conversations/${conversationId}`), {
        headers: buildApiHeaders(undefined, false),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch conversation details');
    }

    return response.json();
}

export async function createConversationApi(title: string): Promise<unknown> {
    const response = await fetch(resolveApiUrl('/chat/conversations'), {
        method: 'POST',
        headers: buildApiHeaders(undefined, true),
        body: JSON.stringify({ title }),
    });

    if (!response.ok) {
        throw new Error('Failed to create conversation');
    }

    return response.json();
}

export async function streamConversationMessageApi(
    conversationId: string,
    payload: StreamChatPayload,
    signal?: AbortSignal
): Promise<Response> {
    // M6: route streaming through the unified /messages endpoint, which
    // content-negotiates via the Accept header (SSE here). The legacy /stream
    // alias is retained server-side for backward compatibility.
    return fetch(resolveApiUrl(`/chat/conversations/${conversationId}/messages`), {
        method: 'POST',
        signal,
        headers: buildApiHeaders({ Accept: 'text/event-stream' }, true),
        body: JSON.stringify(payload),
    });
}

export async function sendConversationMessageApi(
    conversationId: string,
    payload: unknown,
    signal?: AbortSignal
): Promise<Response> {
    return fetch(resolveApiUrl(`/chat/conversations/${conversationId}/messages`), {
        method: 'POST',
        signal,
        headers: buildApiHeaders(undefined, true),
        body: JSON.stringify(payload),
    });
}

export async function updateConversationTitleApi(conversationId: string, title: string): Promise<void> {
    const response = await fetch(resolveApiUrl(`/chat/conversations/${conversationId}`), {
        method: 'PATCH',
        headers: buildApiHeaders(undefined, true),
        body: JSON.stringify({ title }),
    });

    if (!response.ok) {
        throw new Error('Failed to update conversation title');
    }
}

export async function generateConversationTitleApi(
    conversationId: string,
    userMessage: string,
    assistantMessage: string
): Promise<{ title: string }> {
    const response = await fetch(resolveApiUrl(`/chat/conversations/${conversationId}/title`), {
        method: 'POST',
        headers: buildApiHeaders(undefined, true),
        body: JSON.stringify({
            user_message: userMessage,
            assistant_message: assistantMessage,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to generate AI title');
    }

    return response.json();
}

export async function deleteConversationApi(conversationId: string): Promise<void> {
    await fetch(resolveApiUrl(`/chat/conversations/${conversationId}`), {
        method: 'DELETE',
        headers: buildApiHeaders(undefined, false),
    });
}
