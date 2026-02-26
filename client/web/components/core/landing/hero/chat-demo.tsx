"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Loader2, Bot } from "lucide-react";
import { OpentierLogo } from "@/components/core/common/logos/opentier";
import { BorderBeam } from "@/components/ui/border-beam";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export const HeroChatDemo = () => {
    const [messages] = useState<Message[]>([
        { id: "1", role: "user", content: "How does OpenTier scale?" },
    ]);

    const [isTyping, setIsTyping] = useState(false);
    const [streamedContent, setStreamedContent] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const fullResponse =
        "OpenTier separates control and cognition. A Rust gateway handles high-concurrency traffic and security, while Python workers elastically scale for RAG and ML workloads delivering resilience under extreme load.";

    useEffect(() => {
        const stream = async () => {
            setIsTyping(true);
            await new Promise((r) => setTimeout(r, 800));

            let text = "";
            for (const word of fullResponse.split(" ")) {
                text += (text ? " " : "") + word;
                setStreamedContent(text);
                scrollRef.current?.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: "smooth",
                });
                await new Promise((r) => setTimeout(r, 42));
            }

            setIsTyping(false);
        };

        stream();
    }, []);

    return (
        <div className="w-full mx-auto max-w-5xl px-8 sm:px-4 pt-8 sm:pt-12 md:pt-24 pb-12 md:pb-16">

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative rounded-2xl md:rounded-[28px] border border-border/40 dark:border-white/10 bg-gradient-to-b from-background/80 to-background/60 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)] overflow-hidden"
            >
                {/* Energy rails */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />

                {/* Header */}
                <div className="relative flex items-center justify-between px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 border-b border-border/40 dark:border-white/10 bg-background/40">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-md" />
                            <OpentierLogo className="relative h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold tracking-wide">
                            OPENTIER SYSTEM
                        </span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs tracking-widest text-green-500">
                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="hidden sm:inline">ONLINE</span>
                    </div>
                </div>

                {/* Messages */}
                <div
                    ref={scrollRef}
                    className="relative h-[300px] sm:h-[380px] md:h-[460px] overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-10 space-y-4 sm:space-y-6 md:space-y-8"
                >
                    {/* Scanline overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_3px] opacity-20" />

                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35 }}
                                className="relative z-10 flex justify-end gap-2 sm:gap-3 md:gap-4"
                            >
                                <div className="relative max-w-[85%] sm:max-w-[80%] md:max-w-[75%]">
                                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/40 to-transparent opacity-70" />
                                    <div className="relative rounded-xl md:rounded-2xl bg-primary/90 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3.5 text-xs sm:text-sm font-medium text-primary-foreground shadow-lg backdrop-blur">
                                        {msg.content}
                                    </div>
                                </div>

                                <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl border border-border/40 dark:border-white/10 bg-background/50 backdrop-blur flex items-center justify-center shrink-0">
                                    <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary/80" />
                                </div>
                            </motion.div>
                        ))}

                        {(isTyping || streamedContent) && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35 }}
                                className="relative z-10 flex gap-2 sm:gap-3 md:gap-4"
                            >
                                <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl border border-border/40 dark:border-white/10 bg-background/50 backdrop-blur flex items-center justify-center shrink-0">
                                    {isTyping ? (
                                        <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 animate-spin text-primary" />
                                    ) : (
                                        <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary" />
                                    )}
                                </div>

                                <div className="relative max-w-[85%] sm:max-w-[80%] md:max-w-[75%]">
                                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/30 to-transparent opacity-60" />
                                    <div className="relative rounded-xl md:rounded-2xl bg-muted/40 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-xs sm:text-sm leading-relaxed backdrop-blur shadow-md text-left">
                                        {streamedContent}
                                        {isTyping && (
                                            <motion.span
                                                className="ml-1 inline-block h-4 w-[2px] bg-primary rounded"
                                                animate={{ opacity: [0, 1, 0] }}
                                                transition={{ duration: 0.9, repeat: Infinity }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input */}
                <div className="relative border-t border-border/60 dark:border-white/10 bg-background/40 px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                        <input
                            disabled
                            placeholder="Query the system…"
                            className="flex-1 rounded-lg md:rounded-xl border border-border/60 dark:border-white/10 bg-background/60 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm tracking-wide placeholder:text-muted-foreground dark:placeholder:text-muted-foreground/70 opacity-60"
                        />
                        <button
                            disabled
                            className="rounded-lg md:rounded-xl bg-primary/90 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-primary-foreground opacity-60 flex items-center gap-1.5 sm:gap-2"
                        >
                            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Execute</span>
                            <span className="sm:hidden">Send</span>
                        </button>
                    </div>

                    <p className="mt-3 sm:mt-4 text-center text-[9px] sm:text-[11px] tracking-widest text-muted-foreground/90 dark:text-muted-foreground/60">
                        SYSTEM OUTPUT · SIMULATION MODE
                    </p>
                </div>
                <BorderBeam
                    duration={6}
                    size={500}
                    borderWidth={3}
                    className="from-transparent via-red-500 to-transparent"
                />
                <BorderBeam
                    duration={6}
                    delay={3}
                    size={500}
                    borderWidth={3}
                    className="from-transparent via-purple-500 to-transparent"
                />
            </motion.div>
        </div>
    );
};
