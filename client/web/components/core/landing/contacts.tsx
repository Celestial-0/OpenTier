"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
    Terminal,
    Github,
    Mail,
    MessageCircle,
    ArrowRight,
    Check,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MOTION_VARIANTS = {
    container: {
        hidden: {},
        show: { transition: { staggerChildren: 0.1 } },
    },
    item: {
        hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
    },
} as const;

const CONTACT_CHANNELS = [
    {
        icon: Github,
        label: "GitHub Issues",
        description: "Bug reports and feature requests",
        href: "https://github.com/Celestial-0/OpenTier/issues",
        badge: "Open Source",
        badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    {
        icon: MessageCircle,
        label: "Discussions",
        description: "Ask questions, share integrations",
        href: "https://github.com/Celestial-0/OpenTier/discussions",
        badge: "Community",
        badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    {
        icon: Mail,
        label: "Email",
        description: "Enterprise inquiries & partnerships",
        href: "mailto:contact@yashkumarsingh.tech",
        badge: "Direct",
        badgeColor: "bg-primary/10 text-primary border-primary/20",
    },
] as const;

export const Contacts = () => {
    return (
        <section className="relative py-24 overflow-hidden bg-background">
            {/* Top divider */}
            <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

            <div className="container mx-auto px-4">
                {/* Header */}
                <motion.div
                    variants={MOTION_VARIANTS.container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <motion.div variants={MOTION_VARIANTS.item}>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-xs text-muted-foreground mb-6">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ready to integrate
                        </span>
                    </motion.div>
                    <motion.h2
                        variants={MOTION_VARIANTS.item}
                        className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
                    >
                        Start building in minutes
                    </motion.h2>
                    <motion.p
                        variants={MOTION_VARIANTS.item}
                        className="text-lg text-muted-foreground leading-relaxed"
                    >
                        OpenTier is open source and self-hostable. Choose your integration path
                        or deploy the full stack on your infrastructure.
                    </motion.p>
                </motion.div>

                {/* CTA + Contact Row */}
                <motion.div
                    variants={MOTION_VARIANTS.container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    className="grid grid-cols-1 lg:grid-cols-5 gap-4"
                >
                    {/* Primary CTA */}
                    <motion.div
                        variants={MOTION_VARIANTS.item}
                        className="lg:col-span-2 relative rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-8 overflow-hidden flex flex-col justify-between"
                    >
                        <BorderBeam size={300} duration={8} borderWidth={1.5} />
                        <div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Deploy OpenTier today</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                                Self-host the complete stack — Rust gateway, Python intelligence engine, and PostgreSQL —
                                or contribute to the growing ecosystem.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="https://github.com/Celestial-0/OpenTier" target="_blank" rel="noopener noreferrer">
                                <RainbowButton className="w-full text-sm gap-2">
                                    <Github className="h-4 w-4" />
                                    View on GitHub
                                </RainbowButton>
                            </Link>
                            <Link href="/chat">
                                <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-background/60 hover:bg-muted/60 transition-colors text-sm font-medium text-foreground group/btn w-full sm:w-auto">
                                    Try Demo
                                    <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                </button>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Contact Channels */}
                    <motion.div
                        variants={MOTION_VARIANTS.item}
                        className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3"
                    >
                        {CONTACT_CHANNELS.map((channel) => (
                            <Link
                                key={channel.label}
                                href={channel.href}
                                target={channel.href.startsWith("http") ? "_blank" : undefined}
                                rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                                className="group relative rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-border hover:bg-card/60 transition-all overflow-hidden flex flex-col justify-between"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <channel.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", channel.badgeColor)}>
                                            {channel.badge}
                                        </span>
                                    </div>
                                    <p className="font-semibold text-sm text-foreground mb-1">{channel.label}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{channel.description}</p>
                                </div>
                                <ArrowRight className="relative z-10 mt-4 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all self-end" />
                            </Link>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Contact Form */}
                <motion.div
                    variants={MOTION_VARIANTS.container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    className="mt-4"
                >
                    <motion.div
                        variants={MOTION_VARIANTS.item}
                        className="relative rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden"
                    >
                        <BorderBeam size={400} duration={10} borderWidth={1.5} />
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            {/* Left — info pane */}
                            <div className="relative p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/60">
                                <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-xs text-muted-foreground mb-6">
                                        <Mail className="h-3 w-3" />
                                        Get in touch
                                    </span>
                                    <h3 className="text-2xl font-bold text-foreground mb-3">Send us a message</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                                        Have a question, enterprise inquiry, or just want to say hi?
                                        We typically respond within 24 hours.
                                    </p>
                                    <div className="space-y-4">
                                        {[
                                            { icon: MessageCircle, title: "Enterprise & Partnerships", body: "Custom deployments, SLAs, and dedicated support." },
                                            { icon: Github, title: "Open Source Contributions", body: "PRs, issues, and RFC discussions welcome on GitHub." },
                                            { icon: Terminal, title: "Technical Questions", body: "Integration help, architecture reviews, and debugging." },
                                        ].map((item) => (
                                            <div key={item.title} className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
                                                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground">{item.body}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right — form */}
                            <ContactForm />
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};

function ContactForm() {
    const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("sending");
        // Simulate send — wire up your API here
        await new Promise((r) => setTimeout(r, 1200));
        setStatus("sent");
    };

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    if (status === "sent") {
        return (
            <div className="flex flex-col items-center justify-center p-10 gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="h-6 w-6 text-emerald-500" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">Message sent!</h4>
                <p className="text-sm text-muted-foreground max-w-xs">Thanks for reaching out. We&apos;ll get back to you within 24 hours.</p>
                <button
                    onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }}
                    className="mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                >
                    Send another
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-8 lg:p-10 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="cf-name" className="text-xs text-muted-foreground">Name</Label>
                    <Input
                        id="cf-name"
                        placeholder="Yash Kumar"
                        value={form.name}
                        onChange={set("name")}
                        required
                        className="bg-background/60 border-border/60 focus:border-border text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="cf-email" className="text-xs text-muted-foreground">Email</Label>
                    <Input
                        id="cf-email"
                        type="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={set("email")}
                        required
                        className="bg-background/60 border-border/60 focus:border-border text-sm"
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="cf-subject" className="text-xs text-muted-foreground">Subject</Label>
                <Input
                    id="cf-subject"
                    placeholder="Enterprise deployment inquiry"
                    value={form.subject}
                    onChange={set("subject")}
                    required
                    className="bg-background/60 border-border/60 focus:border-border text-sm"
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="cf-message" className="text-xs text-muted-foreground">Message</Label>
                <Textarea
                    id="cf-message"
                    placeholder="Tell us about your use case, team size, or technical question..."
                    value={form.message}
                    onChange={set("message")}
                    required
                    rows={5}
                    className="bg-background/60 border-border/60 focus:border-border text-sm resize-none"
                />
            </div>
            <button
                type="submit"
                disabled={status === "sending"}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
                {status === "sending" ? (
                    <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Sending…
                    </>
                ) : (
                    <>
                        <ArrowRight className="h-4 w-4" />
                        Send Message
                    </>
                )}
            </button>
        </form>
    );
}


