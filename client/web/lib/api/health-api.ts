import { apiClient } from '@/lib/api-client';
import { HealthResponseSchema } from '@/lib/api-types';
import type { HealthResponse } from '@/types';

export async function getRustApiHealth(): Promise<HealthResponse> {
    const res = await apiClient<unknown>('/health/api');
    const parsed = HealthResponseSchema.safeParse(res);
    if (!parsed.success) {
        throw new Error('Invalid health response');
    }
    return parsed.data;
}

export async function getIntelligenceApiHealth(): Promise<HealthResponse> {
    const res = await apiClient<unknown>('/health/intelligence');
    const parsed = HealthResponseSchema.safeParse(res);
    if (!parsed.success) {
        throw new Error('Invalid health response');
    }
    return parsed.data;
}
