"use client";

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
import { useForm } from "@tanstack/react-form";
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

export const Contacts = () => {
    return (
        <section id="contact" className="relative py-24 overflow-hidden bg-background">
            {/* Top fade to merge with FAQ bottom */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-24 bg-linear-to-b from-background to-transparent z-10" />

            <div className="container mx-auto px-4">
                {/* Lamp + Header */}
                <div className="relative flex flex-col items-center mb-16">
                    {/* Lamp Effect */}
                    <div className="relative flex w-full h-52 items-center justify-center isolate z-0 scale-y-125">
                        <motion.div
                            initial={{ opacity: 0, width: "0rem" }}
                            whileInView={{ opacity: 1, width: "30rem" }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
                            style={{ backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))` }}
                            className="absolute inset-auto right-1/2 h-56 overflow-visible w-120 bg-gradient-conic from-[#CE422B] via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
                        >
                            <div className="absolute w-full left-0 bg-background h-40 bottom-0 z-20 mask-[linear-gradient(to_top,white,transparent)]" />
                            <div className="absolute w-40 h-full left-0 bg-background bottom-0 z-20 mask-[linear-gradient(to_right,white,transparent)]" />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, width: "0rem" }}
                            whileInView={{ opacity: 1, width: "30rem" }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
                            style={{ backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))` }}
                            className="absolute inset-auto left-1/2 h-56 w-120 bg-gradient-conic from-transparent via-transparent to-[#CE422B] text-white [--conic-position:from_290deg_at_center_top]"
                        >
                            <div className="absolute w-40 h-full right-0 bg-background bottom-0 z-20 mask-[linear-gradient(to_left,white,transparent)]" />
                            <div className="absolute w-full right-0 bg-background h-40 bottom-0 z-20 mask-[linear-gradient(to_top,white,transparent)]" />
                        </motion.div>
                        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-background blur-2xl" />
                        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 0.5 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
                            className="absolute inset-auto z-50 h-36 w-md -translate-y-1/2 rounded-full bg-[#CE422B] blur-3xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, width: "0rem" }}
                            whileInView={{ opacity: 1, width: "16rem" }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
                            className="absolute inset-auto z-30 h-36 w-64 -translate-y-24 rounded-full bg-[#CE422B] blur-2xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, width: "0rem" }}
                            whileInView={{ opacity: 1, width: "30rem" }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
                            className="absolute inset-auto z-50 h-0.5 w-120 -translate-y-28 bg-[#CE422B]"
                        />
                        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-50 bg-background" />
                    </div>

                    {/* Header */}
                    <motion.div
                        variants={MOTION_VARIANTS.container}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-60px" }}
                        className="relative z-50 -mt-20 text-center max-w-3xl mx-auto"
                    >
                        <motion.div variants={MOTION_VARIANTS.item}>
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-xs text-muted-foreground mb-6">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#3776AB] animate-pulse" />
                                Get in touch
                            </span>
                        </motion.div>
                        <motion.h2
                            variants={MOTION_VARIANTS.item}
                            className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
                        >
                            We&apos;d love to hear from you
                        </motion.h2>
                        <motion.p
                            variants={MOTION_VARIANTS.item}
                            className="text-lg text-muted-foreground leading-relaxed"
                        >
                            Have a question, feedback, or partnership inquiry?
                            <br />
                            Drop us a message and our team will get back to you.
                        </motion.p>
                    </motion.div>
                </div>

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
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const form = useForm({
        defaultValues: {
            name: "",
            email: "",
            subject: "",
            message: "",
        },
        onSubmit: async ({ value }) => {
            setStatus("sending");
            setErrorMsg("");

            try {
                const res = await fetch("/api/contact", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(value),
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    throw new Error(data.message || "Failed to send message.");
                }

                setStatus("sent");
            } catch (err) {
                setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
                setStatus("error");
            }
        },
    });

    if (status === "sent") {
        return (
            <div className="flex flex-col items-center justify-center p-10 gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="h-6 w-6 text-emerald-500" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">Message sent!</h4>
                <p className="text-sm text-muted-foreground max-w-xs">Thanks for reaching out. We&apos;ll get back to you within 24 hours.</p>
                <button
                    onClick={() => { setStatus("idle"); setErrorMsg(""); form.reset(); }}
                    className="mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                >
                    Send another
                </button>
            </div>
        );
    }

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
            }}
            className="p-8 lg:p-10 space-y-5"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <form.Field
                    name="name"
                    children={(field) => (
                        <div className="space-y-1.5">
                            <Label htmlFor="cf-name" className="text-xs text-muted-foreground">Name</Label>
                            <Input
                                id="cf-name"
                                placeholder="Yash Kumar Singh"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                required
                                className="bg-background/60 border-border/60 focus:border-border text-sm"
                            />
                        </div>
                    )}
                />
                <form.Field
                    name="email"
                    children={(field) => (
                        <div className="space-y-1.5">
                            <Label htmlFor="cf-email" className="text-xs text-muted-foreground">Email</Label>
                            <Input
                                id="cf-email"
                                type="email"
                                placeholder="yashkumarsingh@ieee.org"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                required
                                className="bg-background/60 border-border/60 focus:border-border text-sm"
                            />
                        </div>
                    )}
                />
            </div>
            <form.Field
                name="subject"
                children={(field) => (
                    <div className="space-y-1.5">
                        <Label htmlFor="cf-subject" className="text-xs text-muted-foreground">Subject</Label>
                        <Input
                            id="cf-subject"
                            placeholder="Enterprise deployment inquiry"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                            className="bg-background/60 border-border/60 focus:border-border text-sm"
                        />
                    </div>
                )}
            />
            <form.Field
                name="message"
                children={(field) => (
                    <div className="space-y-1.5">
                        <Label htmlFor="cf-message" className="text-xs text-muted-foreground">Message</Label>
                        <Textarea
                            id="cf-message"
                            placeholder="Tell us about your use case, team size, or technical question..."
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                            rows={5}
                            className="bg-background/60 border-border/60 focus:border-border text-sm resize-none"
                        />
                    </div>
                )}
            />
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
            {status === "error" && errorMsg && (
                <p className="text-sm text-red-500 text-center">{errorMsg}</p>
            )}
        </form>
    );
}


