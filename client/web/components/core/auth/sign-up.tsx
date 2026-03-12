import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, Check } from "lucide-react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
// import {
//     Select,
//     SelectContent,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select"
import { signupSchema, type AuthView } from "./constants"
import { OTPInput } from "@/components/core/auth/otp-input"
import { toast } from "sonner"

export function SignUpFlow({
    onNavigate,
    onSubmit,
    onVerify,
    onComplete
}: {
    onNavigate: (view: AuthView) => void
    onSubmit: (data: z.infer<typeof signupSchema>) => Promise<void> | void
    onVerify?: (email: string, otp: string, token?: string) => Promise<void> | void
    onComplete?: () => void
}) {
    const [step, setStep] = React.useState(0)
    const [direction, setDirection] = React.useState(0)
    const [otp, setOtp] = React.useState("")
    const [isVerifying, setIsVerifying] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
            name: "",
            contributor_opt_in: false,
        },
    })

    const steps = [
        {
            title: "Create Account",
            subtitle: "Start your journey with us",
            fields: ["email", "password"] as const
        },
        {
            title: "Personal Details",
            subtitle: "Tell us a bit about yourself",
            fields: ["name"] as const
        },
        {
            title: "Verification",
            subtitle: "Enter the code sent to your email",
            fields: [] as const
        }
    ]

    const nextStep = async () => {
        if (step === 2) {
            handleVerify()
            return
        }

        // Validate current step fields against zod schema directly
        const values = form.state.values
        const validationResult = step === 0
            ? signupSchema.pick({ email: true, password: true }).safeParse(values)
            : signupSchema.pick({ name: true, contributor_opt_in: true }).safeParse(values)

        if (!validationResult.success) {
            // Touch fields to surface errors via field-level validators
            await Promise.all(
                steps[step].fields.map((f) => form.validateField(f, 'change'))
            )
            return
        }

        if (step === 1) {
            setIsSubmitting(true)
            setError(null)
            try {
                await onSubmit(form.state.values as z.infer<typeof signupSchema>)
                setDirection(1)
                setStep(s => s + 1)
            } catch (err: unknown) {
                console.error("Signup failed in flow", err)
                setError(err instanceof Error ? err.message : "Failed to create account")
            } finally {
                setIsSubmitting(false)
            }
        } else {
            setDirection(1)
            setStep(s => s + 1)
        }
    }

    const handleVerify = async () => {
        if (otp.length !== 6) {
            toast.error("Please enter a valid 6-digit code")
            return
        }
        setIsVerifying(true)
        try {
            await onVerify?.(form.getFieldValue("email"), otp)
            toast.success("Email verified successfully!")
            onComplete?.()
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to verify email")
        } finally {
            setIsVerifying(false)
        }
    }

    const prevStep = () => {
        setError(null)
        if (step > 0) {
            setDirection(-1)
            setStep(s => s - 1)
        } else {
            onNavigate('signin')
        }
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <button
                    onClick={prevStep}
                    className="rounded-full p-1 hover:bg-accent"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium">
                    {step === 0 ? "Back to sign in" : "Back"}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1 h-1">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-full flex-1 rounded-full transition-colors duration-300",
                            i <= step ? "bg-primary" : "bg-muted"
                        )}
                    />
                ))}
            </div>

            <div className="overflow-hidden min-h-75 flex flex-col justify-between">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        className="space-y-6 h-full flex flex-col"
                    >
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                {steps[step].title}
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {steps[step].subtitle}
                            </p>
                        </div>

                        <div className="space-y-4 grow">
                            {step === 0 && (
                                <>
                                    <form.Field
                                        name="email"
                                        validators={{ onChange: signupSchema.shape.email }}
                                    >
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label>Email</Label>
                                                <Input
                                                    type="email"
                                                    placeholder="name@example.com"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                                {field.state.meta.errors.length > 0 && (
                                                    <p className="text-xs text-destructive">{(field.state.meta.errors[0] as any)?.message || (typeof field.state.meta.errors[0] === 'string' ? field.state.meta.errors[0] : "Invalid input")}</p>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>
                                    <form.Field
                                        name="password"
                                        validators={{ onChange: signupSchema.shape.password }}
                                    >
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label>Password</Label>
                                                <Input
                                                    type="password"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                                {field.state.meta.errors.length > 0 && (
                                                    <p className="text-xs text-destructive">{(field.state.meta.errors[0] as any)?.message || (typeof field.state.meta.errors[0] === 'string' ? field.state.meta.errors[0] : "Invalid input")}</p>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>
                                </>
                            )}

                            {step === 1 && (
                                <>
                                    <form.Field
                                        name="name"
                                        validators={{ onChange: signupSchema.shape.name }}
                                    >
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label>Full Name</Label>
                                                <Input
                                                    placeholder="John Doe"
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

                                    <form.Field name="contributor_opt_in">
                                        {(field) => (
                                            <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 h-4 w-4"
                                                    checked={field.state.value}
                                                    onChange={(e) => field.handleChange(e.target.checked)}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    I want to opt in as a contributor and submit knowledge resources.
                                                </span>
                                            </label>
                                        )}
                                    </form.Field>
                                </>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 py-2 flex justify-center">
                                    <OTPInput
                                        value={otp}
                                        onChange={setOtp}
                                        disabled={isVerifying}
                                    />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="space-y-3 pt-2">
                                <p className="text-sm text-destructive text-center font-medium bg-destructive/10 py-2 rounded-lg">
                                    {error}
                                </p>
                                {error === "Email already exists" && (
                                    <Button
                                        variant="outline"
                                        onClick={() => onNavigate('signin')}
                                        className="w-full rounded-xl border-dashed"
                                    >
                                        Sign in to existing account
                                    </Button>
                                )}
                            </div>
                        )}

                        <Button
                            onClick={nextStep}
                            className="w-full rounded-xl mt-auto"
                            disabled={isSubmitting || isVerifying}
                        >
                            {step === steps.length - 1 ? (
                                <span className="flex items-center gap-2">
                                    {isVerifying ? "Verifying..." : "Verify Account"} <Check className="h-4 w-4" />
                                </span>
                            ) : step === 1 ? (
                                <span className="flex items-center gap-2">
                                    {isSubmitting ? "Creating..." : "Create Account"} <ChevronRight className="h-4 w-4" />
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Continue <ChevronRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div >
    )
}
