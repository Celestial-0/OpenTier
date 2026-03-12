// ============================================================================
// KNOWLEDGE SUBMISSION / QUEUE TYPES
// ============================================================================

export interface SubmitResourceRequest {
    title: string;
    content: string;
    resource_type?: string;
    metadata?: Record<string, string>;
}

export interface SubmitResourceResponse {
    submission_id: string;
    status: string;
    message: string;
    created_at: string;
}

export interface SubmissionItem {
    id: string;
    contributor_id: string;
    contributor_email?: string | null;
    contributor_name?: string | null;
    title: string;
    content: string;
    resource_type: string;
    metadata: unknown;
    status: string;
    admin_feedback?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface QueueListResponse {
    items: SubmissionItem[];
    total: number;
}

export interface ReviewRequest {
    action: "approve" | "reject";
    feedback?: string;
}

export interface ReviewResponse {
    submission_id: string;
    status: string;
    message: string;
    resource_id?: string | null;
    job_id?: string | null;
}
