import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, Check } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { signupSchema, type AuthView } from "./constants"
import { OTPInput } from "@/components/auth/otp-input"
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

    // We bind the entire schema to the form, but validate step-by-step
    const form = useForm<z.infer<typeof signupSchema>>({
        resolver: zodResolver(signupSchema),
        mode: "onChange"
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
            fields: ["fullName"] as const
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

        const fields = steps[step].fields
        const isValid = await form.trigger(fields as any) // Type assertion due to empty fields array in step 2

        if (isValid) {
            if (step === 1) {
                setIsSubmitting(true)
                setError(null)
                try {
                    await onSubmit(form.getValues())
                    setDirection(1)
                    setStep(s => s + 1)
                } catch (err: any) {
                    console.error("Signup failed in flow", err)
                    setError(err.message || "Failed to create account")
                } finally {
                    setIsSubmitting(false)
                }
            } else if (step < steps.length - 1) {
                setStep(s => s + 1)
            }
        }
    }

    const handleVerify = async () => {
        if (otp.length !== 6) {
            toast.error("Please enter a valid 6-digit code")
            return
        }
        setIsVerifying(true)
        try {
            await onVerify?.(form.getValues("email"), otp)
            toast.success("Email verified successfully!")
            onComplete?.()
        } catch (e: any) {
            toast.error(e.message || "Failed to verify email")
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

            <div className="overflow-hidden min-h-[300px] flex flex-col justify-between">
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

                        <div className="space-y-4 flex-grow">
                            {step === 0 && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="name@example.com"
                                            {...form.register("email")}
                                        />
                                        {form.formState.errors.email && (
                                            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            {...form.register("password")}
                                        />
                                        {form.formState.errors.password && (
                                            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {step === 1 && (
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input
                                        placeholder="John Doe"
                                        {...form.register("fullName")}
                                    />
                                    {form.formState.errors.fullName && (
                                        <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                                    )}
                                </div>
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
