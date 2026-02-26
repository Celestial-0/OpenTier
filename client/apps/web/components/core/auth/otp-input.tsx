"use strict";
import * as React from "react"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface OTPProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    className?: string
}

export function OTPInput({ value, onChange, disabled, className }: OTPProps) {
    return (
        <div className={cn("space-y-4 flex flex-col items-center", className)}>
            <Label className="sr-only">Verification Code</Label>
            <InputOTP
                maxLength={6}
                value={value}
                onChange={onChange}
                disabled={disabled}
            >
                <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code sent to your email.
            </p>
        </div>
    )
}
