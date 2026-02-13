import * as React from "react"
import { motion } from "framer-motion"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OTPInput } from "@/components/core/landing/auth/otp-input"
import { type AuthView } from "@/components/core/landing/auth/constants"
import { toast } from "sonner"

interface VerifyViewProps {
    onNavigate: (view: AuthView) => void
    onVerify: (email: string, otp: string, token?: string) => Promise<void> | void
    onResend: (email: string) => Promise<void> | void
    initialEmail?: string
}

export function VerifyView({
    onNavigate,
    onVerify,
    onResend,
    initialEmail = ""
}: VerifyViewProps) {
    const [email, setEmail] = React.useState(initialEmail)
    const [otp, setOtp] = React.useState("")
    const [isVerifying, setIsVerifying] = React.useState(false)

    const handleVerify = async () => {
        if (!email || otp.length !== 6) {
            toast.error("Please provide valid email and code")
            return
        }
        setIsVerifying(true)
        try {
            await onVerify(email, otp)
            toast.success("Email verified successfully!")
            onNavigate('signin')
        } catch (e: any) {
            toast.error(e.message || "Verification failed")
        } finally {
            setIsVerifying(false)
        }
    }

    const handleResend = async () => {
        if (!email) return
        try {
            await onResend(email)
            toast.success("Verification code sent!")
        } catch (e: any) {
            toast.error(e.message || "Failed to resend code")
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onNavigate('signin')}
                    className="rounded-full p-1 hover:bg-accent"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium">Verify Email</span>
            </div>

            <div className="space-y-4 text-center">
                <h2 className="text-2xl font-bold tracking-tight">Check your inbox</h2>
                <p className="text-sm text-muted-foreground">
                    We sent a verification code to {email || "your email"}.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        disabled={!!initialEmail}
                    />
                </div>

                <div className="flex justify-center py-2">
                    <OTPInput
                        value={otp}
                        onChange={setOtp}
                        disabled={isVerifying}
                    />
                </div>

                <div className="text-center text-sm">
                    <button
                        onClick={handleResend}
                        className="text-primary hover:underline"
                        type="button"
                    >
                        Resend code
                    </button>
                </div>

                <Button
                    onClick={handleVerify}
                    className="w-full rounded-xl"
                    disabled={isVerifying || otp.length !== 6}
                >
                    {isVerifying ? "Verifying..." : "Verify Email"}
                </Button>
            </div>
        </motion.div>
    )
}
