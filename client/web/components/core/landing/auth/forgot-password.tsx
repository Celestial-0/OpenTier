import * as React from "react"
import { motion } from "framer-motion"
import { ChevronLeft, Check } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { forgotPasswordSchema, type AuthView } from "./constants"

export function ForgotPasswordView({
    onNavigate
}: {
    onNavigate: (view: AuthView) => void
}) {
    const form = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema)
    })
    const [submitted, setSubmitted] = React.useState(false)

    const onSubmit = (data: any) => {
        console.log("Forgot Password", data)
        setSubmitted(true)
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center gap-2">
                <motion.button
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onNavigate('signin')}
                    className="rounded-full p-1 hover:bg-accent"
                >
                    <ChevronLeft className="h-4 w-4" />
                </motion.button>
                <span className="text-sm font-medium">Back to sign in</span>
            </div>

            <div className="text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-semibold tracking-tight text-foreground"
                >
                    Reset password
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 text-sm text-muted-foreground"
                >
                    Enter your email address and we'll send you a link to reset your password
                </motion.p>
            </div>

            {!submitted ? (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-2"
                    >
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                            id="reset-email"
                            type="email"
                            placeholder="name@example.com"
                            {...form.register("email")}
                        />
                        {form.formState.errors.email && (
                            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                        )}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Button type="submit" className="w-full rounded-xl">
                            Send Reset Link
                        </Button>
                    </motion.div>
                </form>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center space-y-4 rounded-2xl bg-muted/50 p-6"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                        className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    >
                        <Check className="h-6 w-6" />
                    </motion.div>
                    <div className="text-center">
                        <h3 className="font-medium text-foreground">Check your email</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            We've sent a password reset link to your email address.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => onNavigate('signin')} className="w-full rounded-xl">
                        Back to Sign In
                    </Button>
                </motion.div>
            )}
        </motion.div>
    )
}
