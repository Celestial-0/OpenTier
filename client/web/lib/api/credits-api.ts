import { apiClient } from "@/lib/api-client";
import type {
    AdjustCreditsRequest,
    AdjustCreditsResponse,
    AdminUserCreditsResponse,
    ModelUsageItem,
    PlatformCreditsStats,
    UserCreditSummary,
    UserTransactionsResponse,
} from "@/types/credits";

export async function fetchUserCreditsApi(): Promise<UserCreditSummary> {
    return apiClient<UserCreditSummary>("/users/me/credits");
}

export async function fetchUserCreditTransactionsApi(params: {
    limit?: number;
    offset?: number;
    reason?: string;
} = {}): Promise<UserTransactionsResponse> {
    const { limit = 20, offset = 0, reason } = params;
    const query = new URLSearchParams();
    query.append("limit", String(limit));
    query.append("offset", String(offset));
    if (reason && reason !== "all") {
        query.append("reason", reason);
    }
    return apiClient<UserTransactionsResponse>(`/users/me/credits/transactions?${query.toString()}`);
}

export async function fetchUserUsageSummaryApi(): Promise<ModelUsageItem[]> {
    return apiClient<ModelUsageItem[]>("/users/me/credits/usage");
}

export async function fetchAdminUserCreditsApi(userId: string): Promise<AdminUserCreditsResponse> {
    return apiClient<AdminUserCreditsResponse>(`/users/${userId}/credits`);
}

export async function adjustUserCreditsApi(
    userId: string,
    payload: AdjustCreditsRequest
): Promise<AdjustCreditsResponse> {
    return apiClient<AdjustCreditsResponse>(`/users/${userId}/credits/adjustments`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function fetchCreditsStatsApi(): Promise<PlatformCreditsStats> {
    return apiClient<PlatformCreditsStats>("/metrics/credits");
}
