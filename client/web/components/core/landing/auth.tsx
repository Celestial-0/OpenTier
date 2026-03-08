"use client"

import { cn } from "@/lib/utils"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { useAuth } from "@/context/auth-context"

interface AuthModalProps {
    triggerText?: string
    className?: string
    id?: string
}

function AuthModal({
    triggerText = "Sign up / Sign in",
    className,
    id
}: AuthModalProps) {
    const { openModal } = useAuth()

    return (
        <InteractiveHoverButton
            id={id}
            onClick={() => openModal()}
            className={cn(className, "border-0 bg-transparent")}
        >
            {triggerText}
        </InteractiveHoverButton>
    )
}

export { AuthModal, type AuthModalProps }
