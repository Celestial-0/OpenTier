"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export default function VerifyEmailPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { verifyEmail, openModal } = useAuth()

    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = React.useState("Verifying your email...")

    const verifiedCalled = React.useRef(false)
    const token = searchParams.get("token")

    React.useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage("Invalid verification link. Missing token.")
            return
        }

        if (verifiedCalled.current) return
        verifiedCalled.current = true

        const verify = async () => {
            try {
                await verifyEmail("", "", token)
                setStatus('success')
                setMessage("Your email has been successfully verified! You can now sign in.")
            } catch (error: any) {
                setStatus('error')
                setMessage(error.message || "Failed to verify email. The link might be expired or invalid.")
            }
        }

        verify()
    }, [token, verifyEmail])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 rounded-3xl border border-border bg-card shadow-2xl text-center space-y-6"
            >
                <div className="flex justify-center">
                    {status === 'loading' && <Loader2 className="h-16 w-16 text-primary animate-spin" />}
                    {status === 'success' && <CheckCircle2 className="h-16 w-16 text-green-500" />}
                    {status === 'error' && <XCircle className="h-16 w-16 text-destructive" />}
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {status === 'loading' && "Verifying..."}
                        {status === 'success' && "Email Verified!"}
                        {status === 'error' && "Verification Failed"}
                    </h1>
                    <p className="text-muted-foreground">
                        {message}
                    </p>
                </div>

                <div className="pt-4">
                    <Button
                        onClick={() => {
                            if (status === 'success') openModal('signin');
                            router.push("/");
                        }}
                        className="w-full rounded-xl"
                        variant={status === 'error' ? 'outline' : 'default'}
                    >
                        {status === 'success' ? "Sign In" : "Back to Home"}
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}
