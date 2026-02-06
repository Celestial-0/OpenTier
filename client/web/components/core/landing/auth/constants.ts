import { z } from "zod"
import { GoogleIcon, AppleIcon, MicrosoftIcon, GitHubIcon, TwitterIcon } from "./icons"

export const signInSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
})

export const forgotPasswordSchema = z.object({
    email: z.email("Invalid email address"),
})

export const signupSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    fullName: z.string().min(2, "Full name is required"),
    companySize: z.string().optional(),
    role: z.string().optional(),
})

export type AuthView = 'signin' | 'signup' | 'forgot-password'

export const socialButtons = [
    { icon: GoogleIcon, label: "Google", color: "hover:bg-accent hover:text-accent-foreground" },
    { icon: AppleIcon, label: "Apple", color: "hover:bg-accent hover:text-accent-foreground" },
    { icon: MicrosoftIcon, label: "Microsoft", color: "hover:bg-accent hover:text-accent-foreground" },
    { icon: GitHubIcon, label: "Github", color: "hover:bg-accent hover:text-accent-foreground" },
    { icon: TwitterIcon, label: "Twitter", color: "hover:bg-accent hover:text-accent-foreground" },
]

export const TEAM_SIZE_OPTIONS = ["1-5", "5-20", "20-50", "50+"]
export const ROLE_OPTIONS = ["Developer", "Designer", "Product Manager", "Founder", "Other"]
