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
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { signupSchema, type AuthView, TEAM_SIZE_OPTIONS, ROLE_OPTIONS } from "./constants"

export function SignUpFlow({
    onNavigate,
    onSubmit
}: {
    onNavigate: (view: AuthView) => void
    onSubmit: (data: z.infer<typeof signupSchema>) => void
}) {
    const [step, setStep] = React.useState(0)
    const [direction, setDirection] = React.useState(0)

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
            title: "Team Info",
            subtitle: "Help us tailor your experience",
            fields: ["companySize", "role"] as const
        }
    ]

    const nextStep = async () => {
        const fields = steps[step].fields
        const isValid = await form.trigger(fields)
        if (isValid) {
            if (step < steps.length - 1) {
                setDirection(1)
                setStep(s => s + 1)
            } else {
                form.handleSubmit(onSubmit)()
            }
        }
    }

    const prevStep = () => {
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
                                <>
                                    <div className="space-y-2">
                                        <Label>Team Size</Label>
                                        <Select
                                            onValueChange={(val) => form.setValue("companySize", val || undefined)}
                                            defaultValue={form.getValues("companySize") || undefined}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select team size" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TEAM_SIZE_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Select
                                            onValueChange={(val) => form.setValue("role", val || undefined)}
                                            defaultValue={form.getValues("role") || undefined}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select your role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLE_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>

                        <Button onClick={nextStep} className="w-full rounded-xl mt-auto">
                            {step === steps.length - 1 ? (
                                <span className="flex items-center gap-2">
                                    Create Account <Check className="h-4 w-4" />
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
        </div>
    )
}
