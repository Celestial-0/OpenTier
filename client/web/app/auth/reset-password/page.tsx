"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import { resetPasswordSchema } from "@/components/core/landing/auth/constants"
import { toast } from "sonner"

export default function ResetPasswordPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { resetPassword, openModal } = useAuth()

    const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = React.useState("")

    const token = searchParams.get("token")

    const form = useForm<z.infer<typeof resetPasswordSchema>>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: ""
        }
    })

    const onSubmit = async (data: z.infer<typeof resetPasswordSchema>) => {
        if (!token) {
            toast.error("Invalid or missing reset token")
            return
        }

        setStatus('loading')
        try {
            await resetPassword(data.password, token)
            setStatus('success')
        } catch (error: any) {
            setStatus('error')
            setErrorMsg(error.message || "Failed to reset password")
            toast.error(error.message || "Failed to reset password")
        }
    }

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
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...form.register("password")}
                                />
                                {form.formState.errors.password && (
                                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    {...form.register("confirmPassword")}
                                />
                                {form.formState.errors.confirmPassword && (
                                    <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                                )}
                            </div>
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
