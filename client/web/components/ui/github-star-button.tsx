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
    const buttonRef = useRef<HTMLDivElement>(null);

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
        if (count == null) return "0";
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}k`;
        }
        return count.toString();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
        <motion.div
            ref={buttonRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY }}
            className={cn(
                "inline-flex will-change-transform [transform-style:preserve-3d]",
                className
            )}
        >
            <Button
                variant="outline"
                nativeButton={false}
                render={<a href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer" />}
                className="
      group relative h-9 px-3 gap-2
      overflow-hidden border-border
      dark:bg-input/30 dark:border-input dark:hover:bg-input/50
    "
            >
                {/* Hover gradient overlay */}
                <motion.div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                />

                {/* GitHub icon */}
                <motion.div
                    className="shrink-0"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 18 }}
                    style={{ translateZ: 8 }}
                >
                    <Github
                        size={16}
                        className="text-muted-foreground transition-colors group-hover:text-green-500"
                    />
                </motion.div>

                <div className="h-4 w-px bg-border" />

                {/* Star icon */}
                <motion.div
                    whileHover={{ rotate: [-8, 8, 0] }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    style={{ translateZ: 8 }}
                >
                    <Star
                        className={cn(
                            "h-3.5 w-3.5 transition-all duration-300",
                            isHovered
                                ? "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.45)]"
                                : "text-muted-foreground group-hover:text-foreground"
                        )}
                    />
                </motion.div>

                {/* Star count */}
                <motion.span
                    className="
        text-sm font-medium tabular-nums
        text-muted-foreground transition-colors
        group-hover:text-foreground
      "
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 350, damping: 18 }}
                    style={{ translateZ: 8 }}
                >
                    {isLoading ? (
                        <motion.span
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                        >
                            •••
                        </motion.span>
                    ) : (
                        stars !== null && formatStars(stars)
                    )}
                </motion.span>

                {/* Shine */}
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={isHovered ? { x: ["-100%", "100%"] } : { x: "-100%" }}
                        transition={{
                            duration: 0.75,
                            ease: "easeInOut",
                            repeat: isHovered ? Infinity : 0,
                            repeatDelay: 1,
                        }}
                    />
                </motion.div>
            </Button>
        </motion.div>
    );
}
