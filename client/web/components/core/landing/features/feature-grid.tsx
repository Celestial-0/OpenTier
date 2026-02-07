import { cn } from "@/lib/utils";
import React from 'react';


import { FEATURE_LIST } from "../data";

export const FeatureGrid = () => {
    const features = FEATURE_LIST;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10">
            {features.map((feature, index) => (
                <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
        </div>
    );
};

const FeatureCard = ({
    title,
    description,
    icon,
    index,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    index: number;
}) => {
    const p = genRandomPattern(index);

    return (
        <div
            className={cn(
                "flex flex-col lg:border-r py-10 relative group/feature border-border overflow-hidden",
                (index === 0 || index === 4) && "lg:border-l border-border",
                index < 4 && "lg:border-b border-border"
            )}
        >
            <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
                <div className="from-foreground/5 to-foreground/1 absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] opacity-100">
                    <GridPattern
                        width={20}
                        height={20}
                        x="-12"
                        y="4"
                        squares={p}
                        className="fill-foreground/5 stroke-foreground/25 absolute inset-0 h-full w-full mix-blend-overlay"
                    />
                </div>
            </div>

            {index < 4 && (
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-muted/50 to-transparent pointer-events-none" />
            )}
            {index >= 4 && (
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-muted/50 to-transparent pointer-events-none" />
            )}
            <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                {icon}
            </div>
            <div className="text-lg font-bold mb-2 relative z-10 px-10">
                <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center" />
                <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">
                    {title}
                </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">
                {description}
            </p>
        </div>
    );
};

function GridPattern({
    width,
    height,
    x,
    y,
    squares,
    ...props
}: React.ComponentProps<'svg'> & { width: number; height: number; x: string; y: string; squares?: number[][] }) {
    const patternId = "grid-pattern-" + React.useId(); // Ensure unique ID

    return (
        <svg aria-hidden="true" {...props}>
            <defs>
                <pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
                    <path d={`M.5 ${height}V.5H${width}`} fill="none" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
            {squares && (
                <svg x={x} y={y} className="overflow-visible">
                    {squares.map(([x, y], index) => (
                        <rect strokeWidth="0" key={index} width={width + 1} height={height + 1} x={x * width} y={y * height} />
                    ))}
                </svg>
            )}
        </svg>
    );
}

function genRandomPattern(seed: number): number[][] {
    // simple seeded logic to be stable across renders if needed, or just random
    // Original component just did random. Let's make it deterministic based on index (seed) if possible?
    // The user didn't ask for deterministic, but it's better for hydration.
    // However, to keep it simple and match "grid-feature-cards.tsx" logic:
    const length = 5;
    return Array.from({ length }, (_, i) => [
        (seed * 7 + i * 3) % 4 + 7, // Pseudo-random x derived from seed
        (seed * 2 + i * 5) % 6 + 1, // Pseudo-random y derived from seed
    ]);
}
