"use strict";
"use client";

import React, { createContext, useContext, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { UserResponse, SignInRequest, SignUpRequest } from "@/lib/api-types";
import { AuthView } from "@/components/core/auth/constants";
import { setAuthToken, removeAuthToken } from "@/lib/auth-utils";
import {
    forgotPasswordApi,
    resendVerificationApi,
    resetPasswordApi,
    signInApi,
    signOutApi,
    signUpApi,
    verifyEmailApi,
} from "@/lib/api/auth-api";


const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

interface AuthContextType {
    user: UserResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (data: SignInRequest) => Promise<void>;
    signUp: (data: SignUpRequest) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    resendVerification: (email: string) => Promise<void>;
    verifyEmail: (email: string, otp: string, token?: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (password: string, token: string) => Promise<void>;
    // Modal State
    isModalOpen: boolean;
    authView: AuthView;
    authError: string | null;
    attemptedEmail: string;
    openModal: (view?: AuthView) => void;
    closeModal: () => void;
    setAuthView: (view: AuthView) => void;
    setAuthError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthActionHandler({ openModal }: { openModal: (view: AuthView) => void }) {
    const searchParams = useSearchParams();
    const authAction = searchParams.get('auth');

    useEffect(() => {
        if (authAction === 'signin') {
            openModal('signin');
        } else if (authAction === 'signup') {
            openModal('signup');
        }
    }, [authAction, openModal]);

    return <></>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    // Use the UserStore for the single source of truth regarding user data
    const { user, fetchUser, logout: storeLogout } = useUserStore();

    // Local loading state for the initial check or auth actions
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [authView, setAuthView] = useState<AuthView>('signin');
    const [authError, setAuthError] = useState<string | null>(null);
    const [attemptedEmail, setAttemptedEmail] = useState("");

    const openModal = (view: AuthView = 'signin') => {
        setAuthView(view);
        setAuthError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // Reset after animation
        setTimeout(() => {
            setAuthView('signin');
            setAuthError(null);
        }, 300);
    };

    // Auto-open logic moved to AuthActionHandler

    const checkAuth = async () => {
        try {
            setIsLoading(true);
            await fetchUser();
        } catch (error) {
            console.error("Auth check failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    const signIn = async (data: SignInRequest) => {
        setIsLoading(true);
        try {
            const responseData = await signInApi(data);

            // Save session token if present
            if (responseData.session_token) {
                setAuthToken(responseData.session_token);
            }

            await fetchUser();
            setIsModalOpen(false);
            router.push("/chat");
        } catch (error: unknown) {
            const message = getErrorMessage(error, "Failed to sign in");

            if (message === "Email not verified" || message.includes("verified")) {
                setAuthView('verify');
                setAuthError(null);
            } else {
                setAuthError(message);
            }
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (data: SignUpRequest) => {
        setIsLoading(true);
        try {
            const apiData = {
                email: data.email,
                password: data.password,
                name: data.name,
                username: data.username,
                contributor_opt_in: data.contributor_opt_in ?? false,
            };

            await signUpApi(apiData);

            setAttemptedEmail(data.email);

            // After signup, we might be automatically logged in or need to log in.
            // Rust API typically returns just a success message or user_id.
            // If it doesn't set a cookie, we need to ask user to login.
            // Assuming specific API behavior: valid signup often leads to login redirect.

            // router.push("/auth/signin?registered=true");
            // Assuming the API creates user but doesn't log them in automatically.
            // We should notify success. The UI (caller) handles redirect/modal switch.
        } catch (error) {
            console.error("Signup failed", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            // Attempt server-side logout, but always clear local state
            await signOutApi();
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            removeAuthToken();
            storeLogout();
            router.push("/");
        }
    };

    const resendVerification = async (email: string) => {
        try {
            await resendVerificationApi(email);
        } catch (error) {
            // console.error("Resend verification failed", error); // Removed
            throw error;
        }
    };

    const verifyEmail = async (email: string, otp: string, token?: string) => {
        try {
            await verifyEmailApi(email, otp, token);
        } catch (error) {
            throw error;
        }
    };

    const forgotPassword = async (email: string) => {
        try {
            await forgotPasswordApi(email);
        } catch (error) {
            throw error;
        }
    };

    const resetPassword = async (password: string, token: string) => {
        try {
            await resetPasswordApi(password, token);
        } catch (error) {
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                signIn,
                signUp,
                logout,
                checkAuth,
                resendVerification,
                verifyEmail,
                forgotPassword,
                resetPassword,
                isModalOpen,
                authView,
                authError,
                attemptedEmail,
                openModal,
                closeModal,
                setAuthView,
                setAuthError
            }}
        >
            <Suspense fallback={<></>}>
                <AuthActionHandler openModal={openModal} />
            </Suspense>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export function useRequireAuth() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, router]);

    return { isAuthenticated, isLoading };
}
