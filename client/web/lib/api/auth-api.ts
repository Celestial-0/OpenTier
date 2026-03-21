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

export type OAuthProvider = 'google' | 'microsoft' | 'github' | 'discord' | 'x';

export type OAuthCallbackPayload = {
    provider: OAuthProvider;
    oauth_code: string;
};

export type OAuthExchangeResponse = {
    provider: OAuthProvider | string;
    session_token: string;
    email: string;
    is_new_user: boolean;
    message: string;
};

export function getOAuthAuthorizeUrl(provider: OAuthProvider): string {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
    return `${apiBase}/auth/oauth/${provider}/authorize`;
}

export function parseOAuthCallbackParams(searchParams: URLSearchParams): {
    data: OAuthCallbackPayload | null;
    error: string | null;
} {
    const error = searchParams.get('error');
    if (error) {
        const errorDescription = searchParams.get('error_description');
        return { data: null, error: errorDescription ? `${error}: ${errorDescription}` : error };
    }

    const provider = searchParams.get('provider');
    const oauthCode = searchParams.get('oauth_code');

    if (
        (provider !== 'google' && provider !== 'microsoft' && provider !== 'github' && provider !== 'discord' && provider !== 'x') ||
        !oauthCode
    ) {
        return { data: null, error: 'Invalid OAuth callback payload' };
    }

    return {
        data: {
            provider,
            oauth_code: oauthCode,
        },
        error: null,
    };
}

export async function exchangeOAuthCodeApi(code: string): Promise<OAuthExchangeResponse> {
    const response = await fetch(resolveApiUrl('/auth/oauth/exchange'), {
        method: 'POST',
        headers: buildApiHeaders(undefined, true),
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to exchange OAuth code'));
    }

    return response.json() as Promise<OAuthExchangeResponse>;
}

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
    const response = await fetch(resolveApiUrl('/auth/signout'), {
        method: 'POST',
        headers: buildApiHeaders(undefined, false),
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to sign out'));
    }
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

export async function getEnabledOAuthProvidersApi(): Promise<OAuthProvider[]> {
    try {
        const response = await fetch(resolveApiUrl('/auth/oauth/providers'), {
            method: 'GET',
            headers: buildApiHeaders(undefined, true),
        });

        if (!response.ok) {
            return ['google', 'microsoft', 'github', 'discord', 'x']; // Fallback to all providers if endpoint fails
        }

        const data = await response.json() as { providers: string[] };
        return (data.providers as unknown[]).filter(
            (p): p is OAuthProvider => p === 'google' || p === 'microsoft' || p === 'github' || p === 'discord' || p === 'x'
        );
    } catch {
        // Fallback to all providers if request fails
        return ['google', 'microsoft', 'github', 'discord', 'x'];
    }
}
