import { apiClient } from '@/lib/api-client';
import {
    AddResourceRequest,
    ListResourcesResponse,
    ListResourcesResponseSchema,
    QueueListResponse,
    QueueListResponseSchema,
    ResourceItemResponse,
    ReviewRequest,
    ReviewResponse,
    ReviewResponseSchema,
    SubmissionItem,
    SubmitResourceRequest,
    SubmitResourceResponse,
    SubmitResourceResponseSchema,
} from '@/lib/api-types';
import { buildApiHeaders, resolveApiUrl } from '@/lib/api/base';

// ============================================================================
// RESOURCE MANAGEMENT
// ============================================================================

export async function fetchResourcesApi(params: {
    resource_type?: string;
    status?: string;
    limit?: number;
    cursor?: string;
}): Promise<ListResourcesResponse> {
    const { resource_type, status, limit = 20, cursor } = params;
    const queryParams = new URLSearchParams();
    if (resource_type) queryParams.append('resource_type', resource_type);
    if (status) queryParams.append('status', status);
    queryParams.append('limit', String(limit));
    if (cursor) queryParams.append('cursor', cursor);

    const data = await apiClient<unknown>(`/resources?${queryParams.toString()}`);
    const parsed = ListResourcesResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid resources data');
    return parsed.data;
}

export async function addResourceApi(
    data: AddResourceRequest
): Promise<{ resource_id?: string; job_id?: string; status?: string }> {
    return apiClient('/resources', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function deleteResourceApi(resourceId: string): Promise<void> {
    await apiClient(`/resources/${resourceId}`, { method: 'DELETE' });
}

export async function getResourceStatusApi(
    resourceId: string,
    jobId?: string
): Promise<ResourceItemResponse & { progress?: number; error?: string }> {
    const qs = jobId ? `?job_id=${encodeURIComponent(jobId)}` : '';
    const response = await fetch(resolveApiUrl(`/resources/${resourceId}${qs}`), {
        headers: buildApiHeaders(undefined, false),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch resource status (${response.status})`);
    }

    return response.json();
}

// ============================================================================
// SUBMISSIONS & MODERATION
// ============================================================================

const DEFAULT_SUBMISSION_LIMIT = 20;

export async function getMySubmissions(
    limit: number = DEFAULT_SUBMISSION_LIMIT
): Promise<SubmissionItem[]> {
    const data = await apiClient<unknown>(`/resources/submissions?filter=me&limit=${limit}`);
    const parsed = QueueListResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid submissions response received');
    return parsed.data.items;
}

export async function submitResourceForReview(
    body: SubmitResourceRequest
): Promise<SubmitResourceResponse> {
    const data = await apiClient<unknown>('/resources/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    const parsed = SubmitResourceResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid submission response received');
    return parsed.data;
}

export async function getSubmissionQueue(
    status: string = 'pending',
    limit: number = 50
): Promise<QueueListResponse> {
    const data = await apiClient<unknown>(`/resources/submissions?status=${status}&limit=${limit}`);
    const parsed = QueueListResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid moderation queue response received');
    return parsed.data;
}

export async function reviewSubmission(
    submissionId: string,
    body: ReviewRequest
): Promise<ReviewResponse> {
    const data = await apiClient<unknown>(`/resources/submissions/${submissionId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    const parsed = ReviewResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid review response received');
    return parsed.data;
}
