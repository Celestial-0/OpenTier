"use strict";
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { UserResponse, SignInRequest, SignUpRequest } from "@/lib/api-types";
import { AuthView } from "@/components/core/landing/auth/constants";
import { setAuthToken, removeAuthToken } from "@/lib/auth-utils";

interface AuthContextType {
    user: UserResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (data: SignInRequest) => Promise<void>;
    signUp: (data: any) => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    // Use the UserStore for the single source of truth regarding user data
    const { user, setUser, fetchUser, logout: storeLogout } = useUserStore();

    // Local loading state for the initial check or auth actions
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [authView, setAuthView] = useState<AuthView>('signin');
    const [authError, setAuthError] = useState<string | null>(null);
    const [attemptedEmail, setAttemptedEmail] = useState("");

    const searchParams = useSearchParams();
    const authAction = searchParams.get('auth');

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

    // Auto-open based on query params on mount
    useEffect(() => {
        if (authAction === 'signin') {
            openModal('signin');
        } else if (authAction === 'signup') {
            openModal('signup');
        }
    }, [authAction]);

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
            const res = await fetch("/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const text = await res.text();
                // console.error("SignIn Raw Response:", text); // Removed
                let message = "Failed to sign in";
                try {
                    const json = JSON.parse(text);
                    message = json.error || json.message || message;
                } catch (e) {
                    if (text.length > 0) message = text;
                }
                throw new Error(message);
            }

            const responseData = await res.json();

            // Save session token if present
            if (responseData.session_token) {
                setAuthToken(responseData.session_token);
            }

            await fetchUser();
            setIsModalOpen(false);
            router.push("/chat");
        } catch (error: any) {
            if (error.message === "Email not verified" || error.message?.includes("verified")) {
                setAuthView('verify');
                setAuthError(null);
            } else {
                setAuthError(error.message || "Failed to sign in");
            }
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (data: any) => {
        setIsLoading(true);
        try {
            const apiData = {
                email: data.email,
                password: data.password,
                name: data.fullName || data.name,
                username: data.username
            };

            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiData),
            });

            setAttemptedEmail(data.email);

            if (!res.ok) {
                const text = await res.text();
                // console.error("SignUp Raw Response:", text); // Removed
                let message = "Failed to sign up";
                try {
                    const json = JSON.parse(text);
                    message = json.error || json.message || message;
                } catch (e) {
                    // Not JSON, use text if available or default
                    if (text.length > 0) message = text;
                }
                throw new Error(message);
            }

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
            await fetch("/api/auth/signout", { method: "POST" });
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            removeAuthToken();
            storeLogout();
            router.push("/");
        }
    };

    // Derived state
    const isAuthenticated = !!user;

    const resendVerification = async (email: string) => {
        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const text = await res.text();
                let message = "Failed to resend verification email";
                try {
                    const json = JSON.parse(text);
                    message = json.error || json.message || message;
                } catch (e) {
                    if (text.length > 0) message = text;
                }
                throw new Error(message);
            }
        } catch (error) {
            // console.error("Resend verification failed", error); // Removed
            throw error;
        }
    };

    const verifyEmail = async (email: string, otp: string, token?: string) => {
        try {
            const url = token
                ? `/api/auth/verify-email?token=${encodeURIComponent(token)}`
                : "/api/auth/verify-email";

            const res = await fetch(url, {
                method: token ? "GET" : "POST",
                headers: { "Content-Type": "application/json" },
                body: token ? undefined : JSON.stringify({ email, otp }),
            });

            if (!res.ok) {
                const text = await res.text();
                let message = "Failed to verify email";
                try {
                    const json = JSON.parse(text);
                    message = json.error || json.message || message;
                } catch (e) {
                    if (text.length > 0) message = text;
                }
                throw new Error(message);
            }
        } catch (error) {
            throw error;
        }
    };

    const forgotPassword = async (email: string) => {
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const text = await res.text();
                let message = "Failed to send password reset email";
                try {
                    const json = JSON.parse(text);
                    message = json.error || json.message || message;
                } catch (e) {
                    if (text.length > 0) message = text;
                }
                throw new Error(message);
            }
        } catch (error) {
            throw error;
        }
    };

    const resetPassword = async (password: string, token: string) => {
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ new_password: password, token }),
            });

            if (!res.ok) {
                const text = await res.text();
                let message = "Failed to reset password";
                try {
                    const json = JSON.parse(text);
                    message = json.error || json.message || message;
                } catch (e) {
                    if (text.length > 0) message = text;
                }
                throw new Error(message);
            }
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
