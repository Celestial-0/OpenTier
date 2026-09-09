import { getAuthHeaders } from '@/lib/auth-utils';

/**
 * Build a normalized internal API URL with /api/v1 prefix.
 * The Next.js proxy strips /api and forwards /v1/... to the gateway.
 */
export function resolveApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (cleanEndpoint.startsWith('/api/v1')) return cleanEndpoint;
    if (cleanEndpoint.startsWith('/v1')) return `/api${cleanEndpoint}`;
    if (cleanEndpoint.startsWith('/api')) {
        // Legacy unversioned path — inject v1.
        return `/api/v1${cleanEndpoint.slice(4)}`;
    }
    return `/api/v1${cleanEndpoint}`;
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

/**
 * Parse best-effort API error from response body.
 * Supports RFC 9457 problem+json (detail field) and legacy {error,message}.
 */
export async function parseApiError(response: Response, fallback: string): Promise<string> {
    try {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            return (
                data?.detail ??
                data?.message ??
                data?.error ??
                fallback
            );
        }

        const text = await response.text();
        return text.trim() || fallback;
    } catch {
        return fallback;
    }
}
