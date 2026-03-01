"use client";

import { motion } from "motion/react";
import { Terminal, Server, Package, ArrowRight } from "lucide-react";
import Link from "next/link";
import { BorderBeam } from "@/components/ui/border-beam";

const STEPS = [
    {
        step: "01",
        icon: Terminal,
        label: "Clone & Configure",
        description: "Grab the repo and fill in your environment variables — DB credentials, LLM API keys, and JWT secret.",
        code: `git clone https://github.com/Celestial-0/OpenTier
cd OpenTier
cp .env.example .env`,
        iconColor: "text-orange-500",
        borderColor: "border-orange-500/30",
        glowColor: "from-orange-500/10",
    },
    {
        step: "02",
        icon: Server,
        label: "Run the Stack",
        description: "One command spins up the Rust gateway, Python intelligence engine, and PostgreSQL with pgvector.",
        code: `docker compose up -d

# Rust API gateway    → :8080
# Python intelligence → :50051
# PostgreSQL + pgvec  → :5432`,
        iconColor: "text-emerald-500",
        borderColor: "border-emerald-500/30",
        glowColor: "from-emerald-500/10",
    },
    {
        step: "03",
        icon: Package,
        label: "Query the API",
        description: "Hit the local Rust gateway directly from any HTTP client once the stack is live.",
        code: `curl http://localhost:8080/v1/chat \\
  -H "Authorization: Bearer <token>" \\
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
                <p className="text-muted-foreground max-w-xl mx-auto text-sm">
                    The full stack — Rust gateway, Python intelligence engine, and Postgres — runs locally via Docker Compose.
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
                            <pre className="rounded-lg bg-background/70 border border-border/50 px-4 py-3 text-[11px] font-mono text-muted-foreground leading-relaxed overflow-x-auto whitespace-pre">
                                {s.code}
                            </pre>
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
                    <BorderBeam size={300} duration={8} borderWidth={1.5} />
                    <div className="relative z-10 text-center sm:text-left">
                        <p className="font-semibold text-foreground">Ready to deploy?</p>
                        <p className="text-sm text-muted-foreground">Read the full setup guide or browse the source on GitHub.</p>
                    </div>
                    <div className="relative z-10 flex items-center gap-3 shrink-0">
                        <Link
                            href="https://github.com/Celestial-0/OpenTier"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            View on GitHub
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href="/chat"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-background/60 hover:bg-muted/60 transition-colors text-sm font-medium text-foreground"
                        >
                            Try Demo
                        </Link>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};
