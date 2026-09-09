"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Terminal, Server, MessageSquare, ArrowRight, Copy, Check } from "lucide-react";
import Link from "next/link";
import { BorderBeam } from "@/components/ui/border-beam";

const CopyButton = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);

    const onCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code", err);
        }
    };

    return (
        <button
            type="button"
            onClick={onCopy}
            title={copied ? "Copied to clipboard" : "Copy to clipboard"}
            aria-label={copied ? "Copied" : "Copy code"}
            className="absolute top-2.5 right-2.5 z-20 inline-flex items-center justify-center h-7 w-7 rounded-md bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 backdrop-blur-xs transition-all duration-200 cursor-pointer shadow-xs"
        >
            {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500 animate-in zoom-in-50 duration-200" />
            ) : (
                <Copy className="h-3.5 w-3.5 transition-transform duration-200 hover:scale-110" />
            )}
        </button>
    );
};


const STEPS = [
    {
        step: "01",
        icon: Terminal,
        label: "Fetch Compose & Config",
        description: "Download the production compose file and environment template — no source code cloning required.",
        code: `curl -O https://raw.githubusercontent.com/Celestial-0/OpenTier/main/server/docker-compose.yml
curl -O https://raw.githubusercontent.com/Celestial-0/OpenTier/main/server/.env.example
cp .env.example .env`,
        iconColor: "text-orange-500",
        borderColor: "border-orange-500/30",
        glowColor: "from-orange-500/10",
    },
    {
        step: "02",
        icon: Server,
        label: "Deploy with Docker",
        description: "Pulls published GHCR container images and boots PostgreSQL 18, Redis 8, Qdrant, Workers, and Gateway.",
        code: `docker compose up -d

# Pulls from GitHub Container Registry (GHCR):
# - ghcr.io/celestial-0/opentier-api:latest
# - ghcr.io/celestial-0/opentier-intelligence:latest
# + PostgreSQL 18, Redis 8 Streams, and Qdrant`,
        iconColor: "text-emerald-500",
        borderColor: "border-emerald-500/30",
        glowColor: "from-emerald-500/10",
    },
    {
        step: "03",
        icon: MessageSquare,
        label: "Query the API",
        description: "Hit the local Rust gateway directly to execute hybrid vector searches and stream real-time tokens.",
        code: `curl http://localhost:4000/v1/chat \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Summarize the docs"}'`,
        iconColor: "text-blue-500",
        borderColor: "border-blue-500/30",
        glowColor: "from-blue-500/10",
    },
] as const;

const MOTION_VARIANTS = {
    container: {
        hidden: {},
        show: { transition: { staggerChildren: 0.12 } },
    },
    item: {
        hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
    },
} as const;

export const QuickStart = () => {
    return (
        <div className="mt-24">
            {/* Header */}
            <div className="text-center mb-12">
                <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                    Up and running in 3 steps
                </h3>
                <p className="text-muted-foreground max-w-3xl mx-auto text-sm">
                    Download the production compose file, deploy the published GHCR containers, and stream intelligence.
                </p>
            </div>

            {/* Steps */}
            <motion.div
                variants={MOTION_VARIANTS.container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            >
                {STEPS.map((s) => (
                    <motion.div
                        key={s.step}
                        variants={MOTION_VARIANTS.item}
                        className={`relative rounded-xl border ${s.borderColor} bg-card/40 backdrop-blur-sm p-6 overflow-hidden group`}
                    >
                        <div className={`absolute inset-0 bg-linear-to-br ${s.glowColor} to-transparent pointer-events-none`} />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-4xl font-black text-muted-foreground/20 leading-none select-none">
                                    {s.step}
                                </span>
                                <div className="ml-auto">
                                    <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                                </div>
                            </div>
                            <p className="font-semibold text-foreground mb-1">{s.label}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{s.description}</p>
                            <div className="relative group/code">
                                <pre className="rounded-lg bg-background/70 border border-border/50 px-4 py-3 pr-11 text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
                                    {s.code}
                                </pre>
                                <CopyButton code={s.code} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* CTA */}
            <motion.div
                variants={MOTION_VARIANTS.container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
            >
                <motion.div
                    variants={MOTION_VARIANTS.item}
                    className="relative rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                    <BorderBeam
                        size={320}
                        duration={8}
                        delay={2}
                        initialOffset={28}
                        borderWidth={1.5}
                        className="aspect-8/1 from-transparent via-primary to-transparent"
                    />
                    <div className="relative z-10 text-center sm:text-left">
                        <p className="font-semibold text-foreground">Ready to deploy?</p>
                        <p className="text-sm text-muted-foreground">Read the full self-hosting guide or browse the source on GitHub.</p>
                    </div>
                    <div className="relative z-10 flex items-center gap-3 shrink-0">
                        <Link
                            href="https://celestial-0.github.io/OpenTier/deployment/docker"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Full Setup Guide
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href="https://github.com/Celestial-0/OpenTier"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-background/60 hover:bg-muted/60 transition-colors text-sm font-medium text-foreground"
                        >
                            View on GitHub
                        </Link>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};
