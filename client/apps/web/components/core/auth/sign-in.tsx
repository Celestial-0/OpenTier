import * as React from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { signInSchema, type AuthView, socialButtons } from "./constants"

export function SignInView({
    onNavigate,
    onSubmit,
    error,
    onResend
}: {
    onNavigate: (view: AuthView) => void
    onSubmit: (data: z.infer<typeof signInSchema>) => void
    error?: string | null
    onResend?: (email: string) => void
}) {
    const form = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema)
    })

    const viewVariants = {
        hidden: { opacity: 0, x: -10 },
        show: {
            opacity: 1,
            x: 0,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        },
        exit: { opacity: 0, x: 10 }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <motion.div
            variants={viewVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-6"
        >
            <motion.div variants={itemVariants} className="space-y-4 text-center">
                <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                <p className="text-sm text-muted-foreground">
                    Enter your credentials to access your account
                </p>
            </motion.div>

            {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 flex flex-col gap-2">
                    <p>{error}</p>
                    {(error === "Email not verified" || error.includes("verified")) && onResend && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                                e.preventDefault();
                                const email = form.getValues("email");
                                if (email) onResend(email);
                            }}
                        >
                            Resend Verification Email
                        </Button>
                    )}
                    {(error === "Email not verified" || error.includes("verified")) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-auto p-0 text-xs text-destructive hover:text-destructive hover:underline"
                            onClick={(e) => {
                                e.preventDefault()
                                onNavigate('verify')
                            }}
                        >
                            Or enter verification code
                        </Button>
                    )}
                </div>
            )}

            <motion.div variants={itemVariants} className="grid grid-cols-5 gap-3">
                {socialButtons.map((btn, i) => (
                    <motion.button
                        key={i}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                            "flex aspect-square items-center justify-center rounded-2xl border border-border bg-background transition-colors",
                            btn.color
                        )}
                        aria-label={`Sign in with ${btn.label}`}
                    >
                        <btn.icon className="h-5 w-5" />
                    </motion.button>
                ))}
            </motion.div>

            <motion.div variants={itemVariants} className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </motion.div>

            <motion.form variants={itemVariants} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <motion.div whileFocus={{ scale: 1.01 }}>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            {...form.register("email")}
                        />
                    </motion.div>
                    {form.formState.errors.email && (
                        <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                            type="button"
                            onClick={() => onNavigate('forgot-password')}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Forgot password?
                        </button>
                    </div>
                    <motion.div whileFocus={{ scale: 1.01 }}>
                        <Input
                            id="password"
                            type="password"
                            {...form.register("password")}
                        />
                    </motion.div>
                    {form.formState.errors.password && (
                        <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                    )}
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button type="submit" className="w-full rounded-xl">
                        Sign In
                    </Button>
                </motion.div>
            </motion.form>

            <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                    onClick={() => onNavigate('signup')}
                    className="font-medium text-foreground hover:underline"
                >
                    Sign up
                </button>
            </motion.p>
        </motion.div>
    )
}
