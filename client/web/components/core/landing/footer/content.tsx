"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, CalendarDays } from "lucide-react";

import { useQuery } from "@/hooks/use-query";
import { apiClient } from "@/lib/api-client";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AnimatedUnderline } from "@/components/ui/animated-underline";
import { OpentierLogo } from "@/components/core/common/logos";

import type { HealthResponse } from "@/lib/api-types";

import { cn } from "@/lib/utils";
import {
    MAIN_LINKS,
    SOCIAL_LINKS,
    SYSTEM_STATUS,
    BRAND_CONFIG,
    DEVELOPER_PROFILE,
    MOTION_VARIANTS,
    FOOTER_TEXT,
} from "@/components/core/landing/data";
import { SocialButton } from "@/components/core/landing/footer/social-button";

export function FooterContent() {

    const RustApiHealth = useQuery<HealthResponse>({
        queryKey: ["rust-api-health"],
        queryFn: () => apiClient<HealthResponse>("/health/api"),
    });
    const PythonApiHealth = useQuery<HealthResponse>({
        queryKey: ["python-api-health"],
        queryFn: () => apiClient<HealthResponse>("/health/intelligence"),
    });

    const isSystemHealthy = RustApiHealth.data?.status === "healthy" && PythonApiHealth.data?.status === "healthy";
    const statusBadgeColor = isSystemHealthy ? "text-emerald-500" : (RustApiHealth.isError || PythonApiHealth.isError ? "text-red-500" : "text-amber-500");
    const statusBadgeBg = isSystemHealthy ? "bg-emerald-500/10 border-emerald-500/20" : (RustApiHealth.isError || PythonApiHealth.isError ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20");
    const statusDotColor = isSystemHealthy ? "bg-emerald-500" : (RustApiHealth.isError || PythonApiHealth.isError ? "bg-red-500" : "bg-amber-500");

    return (
        <div className="container relative z-10 mx-auto px-4 text-center lg:text-left">
            <motion.div
                variants={MOTION_VARIANTS.container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-2"
            >
                {/* Brand */}
                <motion.div
                    variants={MOTION_VARIANTS.item}
                    className="lg:col-span-4 space-y-6 flex flex-col items-center lg:items-start"
                >
                    <Link href="/" className="flex items-center gap-2 w-fit">
                        <OpentierLogo className="w-8 h-8" />
                        <span className="font-bold text-xl tracking-tight">
                            {BRAND_CONFIG.name}
                        </span>
                    </Link>

                    <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                        {BRAND_CONFIG.description}
                    </p>
                </motion.div>

                {/* Links */}
                <motion.div
                    variants={MOTION_VARIANTS.item}
                    className="lg:col-span-4 text-center"
                >
                    <h4 className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-6">
                        {FOOTER_TEXT.exploreTitle}
                    </h4>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 justify-start place-items-start">
                        {MAIN_LINKS.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary block w-fit"
                            >
                                <AnimatedUnderline>
                                    {link.name}
                                </AnimatedUnderline>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                {/* Status + Socials */}
                <motion.div
                    variants={MOTION_VARIANTS.item}
                    className="lg:col-span-4 flex flex-col items-center lg:items-end gap-8 w-full"
                >
                    {/* Status Card */}
                    <div className="w-full max-w-sm rounded-xl border border-foreground/10 backdrop-blur-md p-6 text-left">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {FOOTER_TEXT.systemStatusTitle}
                            </h4>

                            <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 border", statusBadgeBg)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusDotColor)} />
                                <AnimatedShinyText className={cn("text-[10px] font-semibold", statusBadgeColor)}>
                                    {isSystemHealthy ? FOOTER_TEXT.systemStatusBadge : (RustApiHealth.isError || PythonApiHealth.isError ? "Degraded" : "Partial")}
                                </AnimatedShinyText>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {SYSTEM_STATUS.map((item, i) => (
                                <div key={item.label}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <item.icon
                                                className={cn(
                                                    "w-4 h-4",
                                                    item.color
                                                )}
                                                aria-hidden
                                            />
                                            <span className="text-xs font-medium text-foreground/80">
                                                {item.label}
                                            </span>
                                        </div>
                                        <CheckCircle2 className={cn(
                                            "w-4 h-4",
                                            item.label === "Rust API Layer"
                                                ? (RustApiHealth.data?.status === "healthy" ? "text-emerald-500" : (RustApiHealth.isError || RustApiHealth.data?.status === "unhealthy" ? "text-red-500" : "text-muted-foreground"))
                                                : (PythonApiHealth.data?.status === "healthy" ? "text-emerald-500" : (PythonApiHealth.isError || PythonApiHealth.data?.status === "unhealthy" ? "text-red-500" : "text-muted-foreground"))
                                        )} />
                                    </div>

                                    {i !== SYSTEM_STATUS.length - 1 && (
                                        <Separator className="bg-white/5 mt-4" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Socials */}
                    <div className="flex items-center justify-center lg:justify-end gap-4 w-full">
                        <span className="hidden lg:block text-xs text-muted-foreground/50">
                            {FOOTER_TEXT.socialFollowText}
                        </span>
                        {SOCIAL_LINKS.map((social) => (
                            <SocialButton key={social.label} {...social} />
                        ))}
                    </div>
                </motion.div>
            </motion.div>

            {/* Bottom */}
            <motion.div
                variants={MOTION_VARIANTS.item}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="pt-6 flex flex-col items-center gap-6 text-center"
            >
                <HoverCard>
                    <HoverCardTrigger
                        {...({
                            href: DEVELOPER_PROFILE.portfolioUrl,
                            target: "_blank",
                            rel: "noopener noreferrer"
                        } as any)}
                        className="
                                text-xs text-muted-foreground transition-colors
                                hover:text-foreground underline-offset-4
                                text-center
                                cursor-pointer
                                
                            "
                    >
                        {FOOTER_TEXT.designedBy}{" "}
                        <span className="underline">
                            {DEVELOPER_PROFILE.name}
                        </span>
                    </HoverCardTrigger>

                    <HoverCardContent className="w-[360px] border-foreground/10  backdrop-blur-xl p-0 overflow-hidden relative">


                        <div className="p-5 space-y-4 relative z-10">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                                <Avatar className="h-14 w-14">
                                    <AvatarImage
                                        src={DEVELOPER_PROFILE.avatarUrl}
                                        fetchPriority="high"
                                    />
                                    <AvatarFallback>{DEVELOPER_PROFILE.avatarFallback}</AvatarFallback>
                                </Avatar>

                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold leading-none">
                                        {DEVELOPER_PROFILE.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {DEVELOPER_PROFILE.role}
                                    </p>

                                    <div className="flex items-center justify-center sm:justify-start mt-2 text-[11px] text-muted-foreground">
                                        <CalendarDays className="w-3 h-3 mr-2 opacity-70" />
                                        Building since {DEVELOPER_PROFILE.buildingSince}
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {DEVELOPER_PROFILE.bio}
                            </p>

                            <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                                <Link
                                    href={DEVELOPER_PROFILE.portfolioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        buttonVariants({ size: "sm" }),
                                        "h-8 px-4 text-xs"
                                    )}
                                >
                                    View Portfolio
                                </Link>

                                <Link
                                    href={DEVELOPER_PROFILE.githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        buttonVariants({
                                            variant: "ghost",
                                            size: "sm",
                                        }),
                                        "h-8 px-3 text-xs"
                                    )}
                                >
                                    GitHub
                                </Link>
                            </div>
                        </div>

                    </HoverCardContent>
                </HoverCard>

                <p className="text-[10px] text-muted-foreground/40">
                    {FOOTER_TEXT.copyright(new Date().getFullYear())}
                </p>
            </motion.div>
        </div>
    );
}



