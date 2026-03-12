import { getAuthHeaders } from '@/lib/auth-utils';

/** Build a normalized internal API URL with /api prefix. */
export function resolveApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
}

/** Compose request headers with auth and optional JSON content type. */
export function buildApiHeaders(customHeaders?: HeadersInit, includeJson: boolean = true): Headers {
    const base: Record<string, string> = {
        ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
        ...(getAuthHeaders() as Record<string, string>),
    };

    return new Headers({
        ...base,
        ...(customHeaders instanceof Headers ? Object.fromEntries(customHeaders.entries()) : (customHeaders as Record<string, string> | undefined)),
    });
}

/** Parse best-effort API error from JSON/text response body. */
export async function parseApiError(response: Response, fallback: string): Promise<string> {
    try {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            return data?.message ?? data?.error ?? fallback;
        }

        const text = await response.text();
        return text.trim() || fallback;
    } catch {
        return fallback;
    }
}
