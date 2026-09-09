import { resolveApiUrl, buildApiHeaders, parseApiError } from './base';
import type { 
    ChatModelResponse, 
    ProviderResponse, 
    CatalogModelResponse,
    CreateProviderRequest,
    UpdateProviderRequest,
    CreateModelRequest,
    UpdateModelRequest
} from '../api-types';

export async function fetchAvailableModelsApi(): Promise<ChatModelResponse[]> {
    const res = await fetch(resolveApiUrl('/models'), { headers: buildApiHeaders() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch available models'));
    return res.json();
}

export async function fetchProvidersApi(): Promise<ProviderResponse[]> {
    const res = await fetch(resolveApiUrl('/providers'), { headers: buildApiHeaders() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch providers'));
    return res.json();
}

export async function createProviderApi(data: CreateProviderRequest): Promise<ProviderResponse> {
    const res = await fetch(resolveApiUrl('/providers'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to create provider'));
    return res.json();
}

export async function updateProviderApi(id: string, data: UpdateProviderRequest): Promise<ProviderResponse> {
    const res = await fetch(resolveApiUrl(`/providers/${id}`), {
        method: 'PATCH',
        headers: buildApiHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update provider'));
    return res.json();
}

export async function deleteProviderApi(id: string): Promise<void> {
    const res = await fetch(resolveApiUrl(`/providers/${id}`), {
        method: 'DELETE',
        headers: buildApiHeaders(),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to delete provider'));
}

export async function fetchAllModelsApi(): Promise<CatalogModelResponse[]> {
    const res = await fetch(resolveApiUrl('/models?all=true'), { headers: buildApiHeaders() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch models'));
    return res.json();
}

export async function createModelApi(data: CreateModelRequest): Promise<CatalogModelResponse> {
    const res = await fetch(resolveApiUrl('/models'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to create model'));
    return res.json();
}

export async function updateModelApi(id: string, data: UpdateModelRequest): Promise<CatalogModelResponse> {
    const res = await fetch(resolveApiUrl(`/models/${id}`), {
        method: 'PATCH',
        headers: buildApiHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update model'));
    return res.json();
}

export async function deleteModelApi(id: string): Promise<void> {
    const res = await fetch(resolveApiUrl(`/models/${id}`), {
        method: 'DELETE',
        headers: buildApiHeaders(),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to delete model'));
}

export interface ReembedResponse {
    reembedded_chunks: number;
    dimensions: number;
    model_slug: string;
    status: string;
}

export async function reembedAllApi(modelSlug?: string): Promise<ReembedResponse> {
    const res = await fetch(resolveApiUrl('/models/reindex'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify({ model_slug: modelSlug || null }),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to re-embed documents'));
    return res.json();
}
