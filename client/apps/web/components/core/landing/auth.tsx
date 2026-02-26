"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { type AuthView } from "./auth/constants"
import { SignInView } from "./auth/sign-in"
import { SignUpFlow } from "./auth/sign-up"
import { ForgotPasswordView } from "./auth/forgot-password"
import { VerifyView } from "./auth/verify"

import { useAuth } from "@/context/auth-context"

interface AuthModalProps {
    triggerText?: string
    className?: string
    id?: string
}

function AuthModal({
    triggerText = "Sign up / Sign in",
    className,
    id
}: AuthModalProps) {
    const {
        isModalOpen,
        authView,
        authError,
        attemptedEmail,
        openModal,
        closeModal,
        setAuthView,
        signIn,
        signUp,
        resendVerification,
        verifyEmail,
        forgotPassword
    } = useAuth()

    const [mounted, setMounted] = React.useState(false)

    // Cleanup on mount
    React.useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

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

    const modalContent = (
        <AnimatePresence>
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-[400px] overflow-hidden rounded-3xl bg-background p-6 shadow-2xl border border-border"
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
                                    onSubmit={signIn}
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

    return (
        <>
            <InteractiveHoverButton
                id={id}
                onClick={() => openModal()}
                className={cn(className, "border-0 bg-transparent")}
            >
                {triggerText}
            </InteractiveHoverButton>

            {mounted && typeof document !== 'undefined' &&
                createPortal(modalContent, document.body)
            }
        </>
    )
}

export { AuthModal, type AuthModalProps }
