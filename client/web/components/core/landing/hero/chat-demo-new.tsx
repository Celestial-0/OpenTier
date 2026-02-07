"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { UserIcon, BotMessageSquareIcon} from "@/components/core/common/icons/animated";
import { OpentierLogo } from "@/components/core/common/logos";
import { BorderBeam } from "@/components/ui/border-beam";
import { Avatar as UIAvatar } from "@/components/ui/avatar";
import { AIResponseTyping } from "@/components/ui/ai-typing";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface AnimationContainerProps {
    children: React.ReactNode;
    className?: string;
    reverse?: boolean;
    delay?: number;
}

const AnimationContainer = ({ children, className, reverse, delay }: AnimationContainerProps) => {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: reverse ? -20 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.2, delay: delay, ease: 'easeInOut', type: 'spring', stiffness: 260, damping: 20 }}
        >
            {children}
        </motion.div>
    )
};

const Avatar = ({ children }: { children: React.ReactNode }) => (
    <UIAvatar className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl border border-border/40 dark:border-white/10 bg-background/50 backdrop-blur items-center justify-center">
        {children}
    </UIAvatar>
);

const MessageBubble = ({
    children,
    variant = "primary"
}: {
    children: React.ReactNode;
    variant?: "primary" | "muted";
}) => {
    const isPrimary = variant === "primary";
    return (
        <div className="relative max-w-[85%] sm:max-w-[80%] md:max-w-[75%]">
            <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${isPrimary ? "from-primary/40 opacity-70" : "from-primary/30 opacity-60"} to-transparent`} />
            <div className={`relative rounded-xl md:rounded-2xl px-3 sm:px-4 md:px-6 text-xs sm:text-sm shadow-lg backdrop-blur ${isPrimary
                ? "bg-primary/90 py-2 sm:py-2.5 md:py-3.5 font-medium text-primary-foreground"
                : "bg-muted/40 py-2.5 sm:py-3 md:py-4 leading-relaxed text-left"
                }`}>
                {children}
            </div>
        </div>
    );
};

export const HeroChatDemo = () => {
    const [messages] = useState<Message[]>([
        { id: "1", role: "user", content: "How does OpenTier scale?" },
    ]);

    const [thinkingState, setThinkingState] = useState<"idle" | "thinking" | "typing">("idle");
    const scrollRef = useRef<HTMLDivElement>(null);

    const fullResponse =
        "OpenTier separates control and cognition. A Rust gateway handles high-concurrency traffic and security, while Python workers elastically scale for RAG and ML workloads delivering resilience under extreme load.";

    useEffect(() => {
        const stream = async () => {
            setThinkingState("thinking");
            await new Promise((r) => setTimeout(r, 800));
            setThinkingState("typing");
        };

        stream();
    }, []);

    return (
        <AnimationContainer delay={0.2} className="w-full mx-auto max-w-5xl px-8 sm:px-4 pt-8 sm:pt-12 md:pt-24 pb-12 md:pb-16 relative">
            <div className="absolute md:top-[10%] left-1/2 -translate-x-1/2 w-3/4 h-1/4 md:h-1/3 inset-0 blur-[5rem] animate-pulse bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30"></div>
            <div className="-m-2 rounded-xl p-2 ring-1 ring-inset ring-foreground/20 lg:-m-4 lg:rounded-2xl bg-opacity-50 backdrop-blur-3xl">
                <BorderBeam
                    duration={12}
                    size={500}
                    borderWidth={3}
                    className="from-transparent via-red-500 to-transparent"
                />
                <BorderBeam
                    duration={12}
                    delay={6}
                    size={500}
                    borderWidth={3}
                    className="from-transparent via-purple-500 to-transparent"
                />


                <div className="relative rounded-2xl md:rounded-[28px] border border-border/40 dark:border-white/10 bg-gradient-to-b from-background/80 to-background/60 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)] overflow-hidden">

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
                                    <MessageBubble variant="primary">
                                        {msg.content}
                                    </MessageBubble>

                                    <Avatar>
                                        <UserIcon size={16} className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary/80" />
                                    </Avatar>
                                </motion.div>
                            ))}

                            {thinkingState !== "idle" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35 }}
                                    className="relative z-10 flex gap-2 sm:gap-3 md:gap-4"
                                >
                                    <Avatar>
                                        <BotMessageSquareIcon size={16} className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary" />
                                    </Avatar>

                                    <MessageBubble variant="muted">
                                        <AIResponseTyping
                                            text={fullResponse}
                                            thinkingState={thinkingState}
                                            showCursor={true}
                                            variant="minimal"
                                        />
                                    </MessageBubble>
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

                </div>
            </div>
        </AnimationContainer>
    );
};
