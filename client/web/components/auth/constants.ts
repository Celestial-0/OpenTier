import { z } from "zod"
import { GoogleIcon, AppleIcon, MicrosoftIcon, GitHubIcon, TwitterIcon } from "./icons"

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
    fullName: z.string().min(2, "Full name is required"),
})

export type AuthView = 'signin' | 'signup' | 'forgot-password' | 'verify'

export const socialButtons = [
    { icon: GoogleIcon, label: "Google", color: "hover:bg-accent hover:text-accent-foreground" },
    { icon: AppleIcon, label: "Apple", color: "hover:bg-accent hover:text-accent-foreground" },
    { icon: MicrosoftIcon, label: "Microsoft", color: "hover:bg-accent hover:text-accent-foreground" },
    { icon: GitHubIcon, label: "Github", color: "hover:bg-accent hover:text-accent-foreground" },
    { icon: TwitterIcon, label: "Twitter", color: "hover:bg-accent hover:text-accent-foreground" },
]

export const TEAM_SIZE_OPTIONS = ["1-5", "5-20", "20-50", "50+"]
export const ROLE_OPTIONS = ["Developer", "Designer", "Product Manager", "Founder", "Other"]
