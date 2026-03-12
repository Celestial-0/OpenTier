// ============================================================================
// RESOURCE & ADMIN TYPES
// ============================================================================

export interface ResourceConfig {
    depth?: number;
    chunk_size?: number;
    chunk_overlap?: number;
    auto_clean?: boolean;
    generate_embeddings?: boolean;
    follow_links?: boolean;
}

export interface AddResourceRequest {
    resource_type: string;
    content: string;
    title?: string;
    metadata?: Record<string, string>;
    config?: ResourceConfig;
    is_global?: boolean;
}

export interface ResourceItemResponse {
    id: string;
    type: string;
    title?: string | null;
    status: string;
    chunks_created: number;
    created_at: number;
    metadata?: Record<string, string>;
    is_global: boolean;
}

export interface ListResourcesResponse {
    items: ResourceItemResponse[];
    next_cursor?: string | null;
    total: number;
}

export interface DeleteResponse {
    status: string;
    message: string;
}

export type ResourceType = string; // e.g., "url", "pdf", "markdown", etc.
export type ResourceStatus = string; // e.g., "completed", "processing", "failed"
