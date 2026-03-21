import { z } from "zod"
import type { ComponentType } from "react"
import { GoogleIcon, MicrosoftIcon, GitHubIcon, TwitterIcon, DiscordIcon } from "./icons"
import type { OAuthProvider } from "@/lib/api/auth-api"

export const signInSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
})

export const forgotPasswordSchema = z.object({
    email: z.email("Invalid email address"),
})

export const resetPasswordSchema = z.object({
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export const signupSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    name: z.string().min(2, "Full name is required"),
    contributor_opt_in: z.boolean().default(false),
})

export type AuthView = 'signin' | 'signup' | 'forgot-password' | 'verify'

interface SocialButton {
    icon: ComponentType<{ className?: string }>;
    label: string;
    color: string;
    provider?: OAuthProvider;
}

const allSocialButtons: Array<SocialButton> = [
    {
        icon: GoogleIcon,
        label: "Google",
        color: "hover:bg-accent hover:text-accent-foreground",
        provider: "google",
    },
    // { icon: AppleIcon, label: "Apple", color: "hover:bg-accent hover:text-accent-foreground" },
    {   
        icon: MicrosoftIcon, 
        label: "Microsoft", 
        color: "hover:bg-accent hover:text-accent-foreground",
        provider: "microsoft"
    },
    {
        icon: GitHubIcon,
        label: "Github",
        color: "hover:bg-accent hover:text-accent-foreground",
        provider: "github",
    },
    {
        icon: DiscordIcon,
        label: "Discord",
        color: "hover:bg-accent hover:text-accent-foreground",
        provider: "discord",
    },
    {
        icon: TwitterIcon,
        label: "X",
        color: "hover:bg-accent hover:text-accent-foreground",
        provider: "x",
    },
]

/**
 * Get filtered social buttons based on enabled providers
 */
export function getSocialButtons(enabledProviders: OAuthProvider[]): Array<SocialButton> {
    return allSocialButtons.filter(btn => 
        !btn.provider || enabledProviders.includes(btn.provider)
    )
}

export const socialButtons = allSocialButtons

export const TEAM_SIZE_OPTIONS = ["1-5", "5-20", "20-50", "50+"]
export const ROLE_OPTIONS = ["Developer", "Designer", "Product Manager", "Founder", "Other"]
