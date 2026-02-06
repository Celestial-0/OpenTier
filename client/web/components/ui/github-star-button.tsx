'use client';

import { Star } from 'lucide-react';
import { GithubIcon as Github } from '@/components/core/common/icons/animated/github';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';


interface GitHubStarButtonProps {
    repo: string; // Format: "owner/repo"
    className?: string;
}

export function GitHubStarButton({ repo, className }: GitHubStarButtonProps) {
    const [stars, setStars] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const buttonRef = useRef<HTMLAnchorElement>(null);

    // Motion values for smooth mouse tracking
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Spring animations for smooth following
    const springConfig = { damping: 25, stiffness: 300 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), springConfig);

    useEffect(() => {
        const fetchStars = async () => {
            try {
                const response = await fetch(`https://api.github.com/repos/${repo}`);
                const data = await response.json();
                setStars(data.stargazers_count);
            } catch (error) {
                console.error('Failed to fetch GitHub stars:', error);
                setStars(0);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStars();
    }, [repo]);

    const formatStars = (count: number) => {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}k`;
        }
        return count.toString();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        mouseX.set((e.clientX - centerX) / rect.width);
        mouseY.set((e.clientY - centerY) / rect.height);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.a
            ref={buttonRef}
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
            }}
            className={cn(
                "group relative inline-flex items-center gap-2 h-9 px-3 rounded-md",
                "border border-border hover:bg-muted/40 hover:text-foreground",
                "dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
                "shadow-xs transition-all duration-200",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "outline-none select-none",
                className
            )}
        >
            {/* Subtle gradient overlay on hover */}
            <motion.div
                className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0"
                animate={{
                    opacity: isHovered ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
            />

            {/* GitHub Icon */}
            <motion.div
                className="flex-shrink-0"
                animate={{
                    scale: isHovered ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                style={{ transformStyle: 'preserve-3d', translateZ: 10 }}
            >
                <Github size={16} className="text-muted-foreground group-hover:text-green-500 transition-colors" />
            </motion.div>

            {/* Divider */}
            <div className="h-4 w-px bg-border" />

            {/* Star Icon with fill animation */}
            <motion.div
                className="relative"
                animate={{
                    rotate: isHovered ? [0, -10, 10, 0] : 0,
                }}
                transition={{
                    duration: 0.5,
                    ease: "easeInOut",
                }}
                style={{ transformStyle: 'preserve-3d', translateZ: 10 }}
            >
                <Star
                    className={cn(
                        "h-3.5 w-3.5 transition-all duration-300",
                        isHovered
                            ? "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"
                            : "text-muted-foreground group-hover:text-foreground"
                    )}
                />
            </motion.div>

            {/* Star Count with number animation */}
            <motion.span
                className="text-sm font-medium tabular-nums text-muted-foreground group-hover:text-foreground transition-colors"
                animate={{
                    scale: isHovered ? 1.05 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                style={{ transformStyle: 'preserve-3d', translateZ: 10 }}
            >
                {isLoading ? (
                    <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        •••
                    </motion.span>
                ) : (
                    stars !== null && formatStars(stars)
                )}
            </motion.span>

            {/* Shine effect on hover */}
            <motion.div
                className="absolute inset-0 rounded-md overflow-hidden pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
            >
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{
                        x: isHovered ? ['-100%', '100%'] : '-100%',
                    }}
                    transition={{
                        duration: 0.8,
                        ease: "easeInOut",
                        repeat: isHovered ? Infinity : 0,
                        repeatDelay: 1,
                    }}
                />
            </motion.div>
        </motion.a>
    );
}
