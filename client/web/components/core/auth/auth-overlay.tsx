"use client"

import { createPortal } from "react-dom"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { X } from "lucide-react"
import { SignInView } from "@/components/core/auth/sign-in"
import { SignUpFlow } from "@/components/core/auth/sign-up"
import { ForgotPasswordView } from "@/components/core/auth/forgot-password"
import { VerifyView } from "@/components/core/auth/verify"

import { useAuth } from "@/context/auth-context"

export function AuthOverlay() {
    const {
        isModalOpen,
        authView,
        authError,
        attemptedEmail,
        enabledProviders,
        closeModal,
        setAuthView,
        signIn,
        signUp,
        startOAuthSignIn,
        resendVerification,
        verifyEmail,
        forgotPassword
    } = useAuth()

    const containerVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        show: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.3
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            y: 10,
            transition: { duration: 0.2 }
        }
    }

    if (typeof document === "undefined") return null

    const modalContent = (
        <AnimatePresence>
            {isModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        layout
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="relative w-full max-w-100 overflow-hidden rounded-3xl bg-background p-6 shadow-2xl border border-border"
                    >
                        <div className="absolute right-4 top-4 z-10">
                            <button
                                onClick={closeModal}
                                className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                            {authView === 'signin' && (
                                <SignInView
                                    key="signin"
                                    onNavigate={setAuthView}
                                    error={authError}
                                    onResend={resendVerification}
                                    onOAuthSignIn={startOAuthSignIn}
                                    onSubmit={signIn}
                                    enabledProviders={enabledProviders}
                                />
                            )}
                            {authView === 'forgot-password' && (
                                <ForgotPasswordView
                                    key="forgot"
                                    onNavigate={setAuthView}
                                    onSubmit={forgotPassword}
                                />
                            )}
                            {authView === 'signup' && (
                                <SignUpFlow
                                    key="signup"
                                    onNavigate={setAuthView}
                                    onVerify={verifyEmail}
                                    onSubmit={signUp}
                                    onComplete={closeModal}
                                />
                            )}
                            {authView === 'verify' && (
                                <VerifyView
                                    onNavigate={setAuthView}
                                    initialEmail={attemptedEmail}
                                    onVerify={async (email, otp, token) => {
                                        await verifyEmail(email, otp, token)
                                        closeModal()
                                    }}
                                    onResend={resendVerification}
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}
