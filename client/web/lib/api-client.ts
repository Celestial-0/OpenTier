import { getAuthHeaders } from "@/lib/auth-utils";

/**
 * A centralized API client for making requests to the OpenTier backend.
 * Automatically handles the /api/v1 prefix, authentication headers, and JSON parsing.
 * Supports RFC 9457 problem+json error responses via the detail field.
 */
export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const { headers: customHeaders, ...restOptions } = options;

    // Ensure endpoint starts with / and resolve to /api/v1 prefix
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let url: string;
    if (cleanEndpoint.startsWith("/api/v1")) {
        url = cleanEndpoint;
    } else if (cleanEndpoint.startsWith("/v1")) {
        url = `/api${cleanEndpoint}`;
    } else if (cleanEndpoint.startsWith("/api")) {
        url = `/api/v1${cleanEndpoint.slice(4)}`;
    } else {
        url = `/api/v1${cleanEndpoint}`;
    }

    const headers = new Headers({
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...customHeaders,
    });

    const response = await fetch(url, {
        ...restOptions,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.detail ||
            errorData.message ||
            `API Request failed with status ${response.status}`
        );
    }

    // Check if response is empty (e.g., 204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
