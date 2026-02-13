import { getAuthHeaders } from "./auth-utils";

/**
 * A centralized API client for making requests to the OpenTier backend.
 * Automatically handles the /api prefix, authentication headers, and JSON parsing.
 */
export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const { headers: customHeaders, ...restOptions } = options;

    // Ensure endpoint starts with / and doesn't duplicate /api
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = cleanEndpoint.startsWith("/api") ? cleanEndpoint : `/api${cleanEndpoint}`;

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
        throw new Error(errorData.message || `API Request failed with status ${response.status}`);
    }

    // Check if response is empty (e.g., 204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
