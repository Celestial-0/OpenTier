import { apiClient } from '@/lib/api-client';
import {
    AdminStats,
    AdminStatsSchema,
} from '@/lib/api-types';
import type { PlatformCreditsStats } from '@/types/credits';

export async function fetchMetricsOverviewApi(): Promise<AdminStats> {
    const data = await apiClient<unknown>('/metrics/overview');
    const parsed = AdminStatsSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid metrics data');
    return parsed.data;
}

export const fetchAdminStatsApi = fetchMetricsOverviewApi;

export async function fetchCreditsStatsApi(): Promise<PlatformCreditsStats> {
    return apiClient<PlatformCreditsStats>('/metrics/credits');
}
