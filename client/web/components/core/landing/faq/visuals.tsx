"use client";

import { useState } from "react";

import {
    Shield,
    Lock,
    Zap,
    FileCode,
} from "lucide-react";
import { SiRust, SiPython, SiPostgresql } from "react-icons/si";
import { cn } from "@/lib/utils";
import {
    Terminal,
    TypingAnimation,
    AnimatedSpan
} from "@/components/ui/terminal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 1. Ingestion Visual: Automated Terminal
export const IngestionVisual = () => {
    return (
        <Terminal>
            <TypingAnimation>&gt; opentier-ingestd --watch</TypingAnimation>

            <AnimatedSpan delay={1500} className="text-emerald-500">
                <span>➜ Found 12 new docs in <span className="text-blue-400">repo/docs</span></span>
            </AnimatedSpan>

            <AnimatedSpan delay={2000} className="text-blue-500">
                <span>ℹ Processing: architectural-overview.md...</span>
            </AnimatedSpan>

            <AnimatedSpan delay={2500} className="text-slate-500">
                <span>├─ Cleaning markdown... <span className="text-emerald-500">[OK]</span></span>
            </AnimatedSpan>

            <AnimatedSpan delay={3000} className="text-slate-500">
                <span>├─ Chunking (512 tokens)... <span className="text-emerald-500">[OK]</span></span>
            </AnimatedSpan>

            <AnimatedSpan delay={3500} className="text-slate-500">
                <span>└─ Generating vectors... <span className="text-amber-400 font-bold">100%</span></span>
            </AnimatedSpan>

            <AnimatedSpan delay={4000} className="text-emerald-400">
                <span>✔ Knowledge base updated in 1.4s</span>
            </AnimatedSpan>
        </Terminal>
    );
};

// 2. Privacy Visual: Local Shield
export const PrivacyVisual = () => {
    return (
        <Card className="h-full w-full flex flex-col items-center justify-center bg-background border border-border ring-0 shadow-none relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--color-primary),transparent_95%)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--color-primary),transparent_95%)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    <div className="bg-popover border border-border p-4 rounded-2xl shadow-xl flex items-center justify-center relative">
                        <SiPostgresql className="w-12 h-12 text-primary" />
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            LOCAL
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Badge variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Postgres 15
                    </Badge>
                    <Badge variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
                        <Shield className="w-3 h-3 text-primary" />
                        RBAC Enabled
                    </Badge>
                </div>
            </div>
        </Card>
    );
};

// 3. Integration Visual: Code Snippet
export const IntegrationVisual = () => {
    const [activeTab, setActiveTab] = useState<"python" | "rust">("python");

    return (
        <Card className="flex h-full w-full flex-col bg-background p-5 rounded-xl border border-border ring-0 shadow-none font-mono text-xs overflow-hidden relative text-foreground">
            {/* Tab Bar */}
            <div className="flex items-center gap-0 border-b border-border mb-4 -mx-5 px-5 top-0 absolute w-[calc(100%+40px)] bg-background z-10 pt-4 pb-2">
                <button
                    onClick={() => setActiveTab("python")}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-t-md border-t border-x transition-colors cursor-pointer",
                        activeTab === "python"
                            ? "bg-muted border-border text-blue-500 font-medium"
                            : "border-transparent text-muted-foreground hover:bg-muted/50"
                    )}
                >
                    <SiPython className="w-3 h-3" />
                    <span>intelligence.py</span>
                </button>
                <button
                    onClick={() => setActiveTab("rust")}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-t-md border-t border-x transition-colors cursor-pointer",
                        activeTab === "rust"
                            ? "bg-muted border-border text-orange-500 font-medium"
                            : "border-transparent text-muted-foreground hover:bg-muted/50"
                    )}
                >
                    <SiRust className={cn("w-3 h-3 transition-all", activeTab === "rust" ? "" : "opacity-50 grayscale")} />
                    <span>main.rs</span>
                </button>
            </div>

            <div className="mt-10 overflow-hidden opacity-90 h-full">
                {activeTab === "python" ? (
                    <div className="flex animate-in fade-in duration-300">
                        <div className="text-muted-foreground/50 select-none text-right pr-4 border-r border-border mr-4 font-mono">
                            1<br />2<br />3<br />4<br />5<br />6<br />7
                        </div>
                        <div className="text-foreground font-medium">
                            <span className="text-violet-600 dark:text-violet-400">import</span> grpc<br />
                            <span className="text-violet-600 dark:text-violet-400">from</span> opentier <span className="text-violet-600 dark:text-violet-400">import</span> IntelligenceStub<br />
                            <br />
                            <span className="text-muted-foreground italic"># Connect to local gateway</span><br />
                            channel = grpc.insecure_channel(<span className="text-teal-600 dark:text-teal-400">"localhost:50051"</span>)<br />
                            client = IntelligenceStub(channel)<br />
                            <br />
                            response = client.Chat(query=<span className="text-teal-600 dark:text-teal-400">"Explain RAG"</span>)
                        </div>
                    </div>
                ) : (
                    <div className="flex animate-in fade-in duration-300">
                        <div className="text-muted-foreground/50 select-none text-right pr-4 border-r border-border mr-4 font-mono">
                            1<br />2<br />3<br />4<br />5<br />6<br />7
                        </div>
                        <div className="text-foreground font-medium">
                            <span className="text-violet-600 dark:text-violet-400">use</span> opentier::IntelligenceClient;<br />
                            <br />
                            <span className="text-blue-600 dark:text-blue-400">#[tokio::main]</span><br />
                            <span className="text-violet-600 dark:text-violet-400">async fn</span> <span className="text-blue-600 dark:text-blue-400">main</span>() -&gt; Result&lt;(), Error&gt; &#123;<br />
                            &nbsp;&nbsp;<span className="text-violet-600 dark:text-violet-400">let</span> client = IntelligenceClient::connect(<span className="text-teal-600 dark:text-teal-400">"..."</span>).<span className="text-violet-600 dark:text-violet-400">await</span>?;<br />
                            &nbsp;&nbsp;<span className="text-violet-600 dark:text-violet-400">let</span> res = client.chat(<span className="text-teal-600 dark:text-teal-400">"Explain RAG"</span>).<span className="text-violet-600 dark:text-violet-400">await</span>?;<br />
                            &nbsp;&nbsp;Ok(())<br />
                            &#125;
                        </div>
                    </div>
                )}
            </div>

            {/* Floating execution badge */}
            <div className="absolute bottom-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 backdrop-blur-sm shadow-sm">
                <Zap className="w-3 h-3 fill-current" />
                gRPC CONNECTED
            </div>
        </Card>
    );
};

// 4. Customization Visual: Logic Isolation
export const LogicIsolationVisual = () => {
    return (
        <Card className="h-full w-full flex items-center justify-center bg-background border border-border ring-0 shadow-none relative overflow-hidden">

            <div className="flex items-center gap-8 relative z-10">
                {/* Rust Side */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-popover border border-orange-500/40 flex items-center justify-center shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)]">
                        <SiRust className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] font-bold text-orange-400 tracking-wider">GATEWAY</span>
                </div>

                {/* Connection */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] text-muted-foreground font-mono">gRPC Stream</span>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                        <div className="w-12 h-[2px] bg-gradient-to-r from-orange-500/50 to-blue-500/50" />
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                    </div>
                </div>

                {/* Python Side */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-popover border border-blue-500/40 flex items-center justify-center shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)] relative">
                        <SiPython className="w-8 h-8" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-background animate-bounce" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 tracking-wider">LOGIC</span>
                </div>
            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-foreground) 1px, transparent 0)',
                    backgroundSize: '20px 20px'
                }}
            />
        </Card>
    );
};
