import {
    ContactRequest,
    ContactRequestSchema,
    ContactResponse,
    ContactResponseSchema,
} from '@/lib/api-types';
import { apiClient } from '@/lib/api-client';

export async function submitContactMessage(payload: ContactRequest): Promise<ContactResponse> {
    const validPayload = ContactRequestSchema.parse(payload);

    const data = await apiClient<unknown>('/contact', {
        method: 'POST',
        body: JSON.stringify(validPayload),
    });

    const parsed = ContactResponseSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error('Invalid contact response received');
    }

    return parsed.data;
}
