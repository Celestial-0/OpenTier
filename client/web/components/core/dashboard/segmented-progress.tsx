"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedProgressProps {
  value: number; // 0 to 100
  totalSegments?: number; // default 20
  variant?: "primary" | "emerald" | "amber" | "blue" | "purple" | "rose" | "cyan";
  className?: string;
  segmentClassName?: string;
}

const variantStyles: Record<NonNullable<SegmentedProgressProps["variant"]>, string> = {
  primary: "bg-primary shadow-[0_0_8px_var(--color-primary)]",
  emerald: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]",
  amber: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.35)]",
  blue: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.35)]",
  purple: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.35)]",
  rose: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.35)]",
  cyan: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.35)]",
};

export const SegmentedProgress: React.FC<SegmentedProgressProps> = ({
  value,
  totalSegments = 20,
  variant = "emerald",
  className,
  segmentClassName,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const activeCount = Math.round((clampedValue / 100) * totalSegments);
  const activeColor = variantStyles[variant] || variantStyles.emerald;

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("flex items-center gap-0.5 w-full", className)}
    >
      {Array.from({ length: totalSegments }).map((_, index) => {
        const isActive = index < activeCount;
        return (
          <div
            key={index}
            className={cn(
              "h-3.5 flex-1 min-w-1 rounded-xs transition-colors duration-300",
              isActive ? activeColor : "bg-muted/70 dark:bg-muted/40",
              segmentClassName
            )}
          />
        );
      })}
    </div>
  );
};
