"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react"
import { useForm } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import { resetPasswordSchema } from "@/components/core/auth/constants"
import { toast } from "sonner"

export default function ResetPasswordPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { resetPassword, openModal } = useAuth()

    const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = React.useState("")

    const token = searchParams.get("token")

    const form = useForm({
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
        validators: {
            onSubmit: resetPasswordSchema,
        },
        onSubmit: async ({ value }) => {
            if (!token) {
                toast.error("Invalid or missing reset token")
                return
            }
            setStatus('loading')
            try {
                await resetPassword(value.password, token)
                setStatus('success')
            } catch (error: unknown) {
                setStatus('error')
                const msg = error instanceof Error ? error.message : "Failed to reset password"
                setErrorMsg(msg)
                toast.error(msg)
            }
        },
    })

    if (!token) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
                <div className="w-full max-w-md p-8 rounded-3xl border border-border bg-card shadow-2xl text-center space-y-6">
                    <XCircle className="h-16 w-16 text-destructive mx-auto" />
                    <h1 className="text-2xl font-bold">Invalid Link</h1>
                    <p className="text-muted-foreground">The password reset link is missing or invalid.</p>
                    <Button onClick={() => router.push("/")} className="w-full rounded-xl">Back to Home</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 rounded-3xl border border-border bg-card shadow-2xl space-y-6"
            >
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        {status === 'idle' && <ShieldCheck className="h-12 w-12 text-primary" />}
                        {status === 'loading' && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
                        {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
                        {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {status === 'success' ? "Password Reset!" : "New Password"}
                    </h1>
                    <p className="text-muted-foreground">
                        {status === 'success'
                            ? "Your password has been successfully updated."
                            : "Create a new strong password for your account."}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {status !== 'success' ? (
                        <motion.form
                            key="reset-form"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
                            className="space-y-4"
                        >
                            <form.Field
                                name="password"
                                validators={{ onChange: resetPasswordSchema.shape.password }}
                            >
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                        />
                                        {field.state.meta.errors.length > 0 && (
                                            <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                                        )}
                                    </div>
                                )}
                            </form.Field>
                            <form.Field
                                name="confirmPassword"
                                validators={{ onChange: resetPasswordSchema.shape.confirmPassword }}
                            >
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                        />
                                        {field.state.meta.errors.length > 0 && (
                                            <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                                        )}
                                    </div>
                                )}
                            </form.Field>
                            <Button
                                type="submit"
                                className="w-full rounded-xl py-6 text-base font-semibold"
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? "Updating..." : "Update Password"}
                            </Button>
                        </motion.form>
                    ) : (
                        <motion.div
                            key="success-action"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pt-4"
                        >
                            <Button
                                onClick={() => {
                                    openModal('signin');
                                    router.push("/");
                                }}
                                className="w-full rounded-xl py-6 text-base font-semibold"
                            >
                                Proceed to Sign In
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
