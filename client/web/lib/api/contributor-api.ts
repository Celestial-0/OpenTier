import { apiClient } from '@/lib/api-client';
import {
    QueueListResponse,
    QueueListResponseSchema,
    ReviewRequest,
    ReviewResponse,
    ReviewResponseSchema,
    SubmissionItem,
    SubmitResourceRequest,
    SubmitResourceResponse,
    SubmitResourceResponseSchema,
} from '@/lib/api-types';

const DEFAULT_SUBMISSION_LIMIT = 20;

export async function getMySubmissions(limit: number = DEFAULT_SUBMISSION_LIMIT): Promise<SubmissionItem[]> {
    const data = await apiClient<unknown>(`/resources/submissions/mine?limit=${limit}`);
    const parsed = QueueListResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid submissions response received');
    return parsed.data.items;
}

export async function submitResourceForReview(body: SubmitResourceRequest): Promise<SubmitResourceResponse> {
    const data = await apiClient<unknown>('/resources/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    const parsed = SubmitResourceResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid submission response received');
    return parsed.data;
}

export async function getSubmissionQueue(status: string = 'pending', limit: number = 50): Promise<QueueListResponse> {
    const data = await apiClient<unknown>(`/resources/submissions?status=${status}&limit=${limit}`);
    const parsed = QueueListResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid moderation queue response received');
    return parsed.data;
}

export async function reviewSubmission(submissionId: string, body: ReviewRequest): Promise<ReviewResponse> {
    const data = await apiClient<unknown>(`/resources/submissions/${submissionId}/review`, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    const parsed = ReviewResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid review response received');
    return parsed.data;
}
