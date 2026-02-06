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

interface AuthModalProps {
    triggerText?: string
    onLogin?: (data: any) => void
    className?: string
}

function AuthModal({
    triggerText = "Sign up / Sign in",
    onLogin,
    className
}: AuthModalProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [mounted, setMounted] = React.useState(false)
    const [view, setView] = React.useState<AuthView>('signin')

    // Cleanup on mount
    React.useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Reset view when closing
    React.useEffect(() => {
        if (!isOpen) {
            // Optional: reset view after delay or immediately effect
            const timer = setTimeout(() => setView('signin'), 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

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
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
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
                                onClick={() => setIsOpen(false)}
                                className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                            {view === 'signin' && (
                                <SignInView
                                    key="signin"
                                    onNavigate={setView}
                                    onSubmit={(data) => {
                                        console.log("Login", data)
                                        onLogin?.(data)
                                        // setIsOpen(false) // Optionally keep open or close
                                    }}
                                />
                            )}
                            {view === 'forgot-password' && (
                                <ForgotPasswordView
                                    key="forgot"
                                    onNavigate={setView}
                                />
                            )}
                            {view === 'signup' && (
                                <SignUpFlow
                                    key="signup"
                                    onNavigate={setView}
                                    onSubmit={(data) => {
                                        console.log("Signup", data)
                                        onLogin?.(data)
                                        setIsOpen(false)
                                    }}
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

                onClick={() => setIsOpen(true)}
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
