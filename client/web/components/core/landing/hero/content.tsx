"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuroraText } from "@/components/ui/aurora-text";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { TextEffect } from "@/components/ui/text-effect";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { RainbowButton } from "@/components/ui/rainbow-button";

// Subtle transition variants with spring physics and blur effect
const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(8px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring' as const,
                bounce: 0.2,
                duration: 1.2,
            },
        },
    },
};

export const HeroContent = () => {
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                e.preventDefault();
                // Navigate to chat
                window.location.href = '/chat';
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleOpenCommandPalette = () => {
        setIsCommandPaletteOpen(true);
        // TODO: Implement actual command palette modal
        console.log('Command palette opened');
    };
    return (
        <div className="flex flex-col items-center">
            {/* Animated Badge with stagger effect */}
            <AnimatedGroup
                variants={{
                    container: {
                        visible: {
                            transition: {
                                delayChildren: 0.3,
                            },
                        },
                    },
                    ...transitionVariants,
                }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 border border-border text-sm text-muted-foreground backdrop-blur-sm mb-8 hover:bg-muted transition-colors cursor-pointer relative">
                    <Badge variant="secondary" className="rounded-full px-2 py-1 text-xs font-normal">
                        New
                    </Badge>
                    <AnimatedShinyText shimmerWidth={200}>
                        OpenTier v1.0 is now available
                    </AnimatedShinyText>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    <BorderBeam />
                </div>
            </AnimatedGroup>

            {/* Animated Heading with fade-in-blur effect */}
            <div className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 max-w-5xl mx-auto">
                <TextEffect
                    preset="fade-in-blur"
                    speedSegment={0.3}
                    as="h1"
                    className="text-foreground"
                >
                    Intelligent Knowledge
                </TextEffect>
                <div className="text-foreground mt-2">
                    <TextEffect
                        preset="fade-in-blur"
                        speedSegment={0.3}
                        delay={0.2}
                        as="span"
                    >
                        Built for
                    </TextEffect>
                    {" "}
                    <motion.span
                        initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        transition={{
                            type: 'spring' as const,
                            bounce: 0.2,
                            duration: 1.2,
                            delay: 0.4
                        }}
                        className="inline-block"
                    >
                        <AuroraText
                            colors={["var(--color-primary)", "var(--color-chart-2)"]}
                        >
                            Action
                        </AuroraText>
                    </motion.span>
                </div>
            </div>

            {/* Animated Description with per-line fade-in */}
            <TextEffect
                per="line"
                preset="fade-in-blur"
                speedSegment={0.3}
                delay={0.4}
                as="p"
                className="max-w-3xl text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed"
            >
                OpenTier turns organizational knowledge into real-time, actionable intelligence.
                It's secure by design, fast by default, and built to scale with your business.
            </TextEffect>

            {/* Responsive CTA - Mobile: Button, Desktop: Keyboard Hint */}
            <AnimatedGroup
                variants={{
                    container: {
                        visible: {
                            transition: {
                                delayChildren: 0.6,
                            },
                        },
                    },
                    ...transitionVariants,
                }}
            >
                {/* Mobile: Get Started Button */}
                <div className="md:hidden">
                    <Link href="/chat">
                        <RainbowButton>
                            Get Started
                        </RainbowButton>
                    </Link>
                </div>



                {/* Desktop: Keyboard Shortcut Hint */}
                <div className="hidden md:inline-flex items-center gap-3 rounded-lg bg-muted/10 px-6 py-3 text-sm backdrop-blur-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Press</span>
                    <kbd className="text-muted-foreground text-sm">
                        <span className="text-sm px-0 mx-0">⌘</span> C
                    </kbd>
                    <span className="text-muted-foreground">To Open Chat</span>
                </div>
            </AnimatedGroup>
        </div>
    );
};
