"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { parseOAuthCallbackParams } from "@/lib/api/auth-api"
import { useAuth } from "@/context/auth-context"

export default function OAuthCallbackPage() {
    return (
        <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4 bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <OAuthCallbackContent />
        </React.Suspense>
    )
}

function OAuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { completeOAuthSignIn, openModal } = useAuth()

    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = React.useState('Completing OAuth sign-in...')
    const [errorDetail, setErrorDetail] = React.useState<string | null>(null)

    const handledRef = React.useRef(false)

    React.useEffect(() => {
        if (handledRef.current) return
        handledRef.current = true

        const { data, error } = parseOAuthCallbackParams(searchParams)

        if (error || !data) {
            setStatus('error')
            setMessage('OAuth sign-in failed')
            setErrorDetail(error ?? 'Invalid OAuth callback payload')
            return
        }

        const complete = async () => {
            try {
                await completeOAuthSignIn(data)
                setStatus('success')
                setMessage('Signed in successfully via OAuth')
                setTimeout(() => {
                    router.push('/chat')
                }, 600)
            } catch (err) {
                const reason = err instanceof Error ? err.message : 'Unable to complete OAuth sign-in'
                setStatus('error')
                setMessage('OAuth sign-in failed')
                setErrorDetail(reason)
            }
        }

        complete()
    }, [completeOAuthSignIn, router, searchParams])

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
                        {status === 'loading' && 'Signing You In'}
                        {status === 'success' && 'OAuth Sign-In Complete'}
                        {status === 'error' && 'Sign-In Error'}
                    </h1>
                    <p className="text-muted-foreground">{message}</p>
                    {errorDetail && <p className="text-sm text-destructive">{errorDetail}</p>}
                </div>

                {status === 'error' && (
                    <Button
                        className="w-full rounded-xl"
                        onClick={() => {
                            openModal('signin')
                            router.push('/')
                        }}
                    >
                        Return to Sign In
                    </Button>
                )}
            </motion.div>
        </div>
    )
}
