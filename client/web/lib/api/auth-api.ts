import { apiClient } from '@/lib/api-client';
import {
    SignInRequest,
    SignInResponse,
    SignInResponseSchema,
    SignUpRequest,
    SignUpResponse,
    SignUpResponseSchema,
} from '@/lib/api-types';
import { buildApiHeaders, parseApiError, resolveApiUrl } from '@/lib/api/base';

export async function signInApi(data: SignInRequest): Promise<SignInResponse> {
    const res = await apiClient<unknown>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    const parsed = SignInResponseSchema.safeParse(res);
    if (!parsed.success) {
        throw new Error('Invalid sign-in response');
    }

    return parsed.data;
}

export async function signUpApi(data: SignUpRequest): Promise<SignUpResponse> {
    const res = await apiClient<unknown>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    const parsed = SignUpResponseSchema.safeParse(res);
    if (!parsed.success) {
        throw new Error('Invalid sign-up response');
    }

    return parsed.data;
}

export async function signOutApi(): Promise<void> {
    await fetch(resolveApiUrl('/auth/signout'), { method: 'POST' });
}

export async function resendVerificationApi(email: string): Promise<void> {
    await apiClient('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function verifyEmailApi(email: string, otp: string, token?: string): Promise<void> {
    if (token) {
        const response = await fetch(resolveApiUrl(`/auth/verify-email?token=${encodeURIComponent(token)}`), {
            method: 'GET',
            headers: buildApiHeaders(undefined, true),
        });

        if (!response.ok) {
            throw new Error(await parseApiError(response, 'Failed to verify email'));
        }
        return;
    }

    await apiClient('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
    });
}

export async function forgotPasswordApi(email: string): Promise<void> {
    await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function resetPasswordApi(newPassword: string, token: string): Promise<void> {
    await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassword, token }),
    });
}
