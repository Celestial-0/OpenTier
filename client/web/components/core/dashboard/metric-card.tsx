"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentedProgress, SegmentedProgressProps } from "./segmented-progress";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface MetricCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  targetText?: string;
  progressValue?: number; // 0 to 100
  progressVariant?: SegmentedProgressProps["variant"];
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  subtitle,
  value,
  targetText,
  progressValue = 50,
  progressVariant = "emerald",
  icon: Icon,
  trend,
  className,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden border border-border/60 bg-card/95 hover:border-border/80 transition-all duration-200 shadow-sm",
        onClick && "cursor-pointer hover:bg-accent/40",
        className
      )}
    >
      <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground font-normal">
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
              <Icon className="size-4" />
            </div>
          )}
          {trend && (
            <span
              className={cn(
                "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border",
                trend.isPositive
                  ? "text-primary bg-primary/10 border-primary/20"
                  : "text-destructive bg-destructive/10 border-destructive/20"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}
            </span>
          )}
        </div>

        {/* Value and Target Context */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {value}
          </span>
          {targetText && (
            <span className="text-xs sm:text-sm text-muted-foreground font-normal">
              {targetText}
            </span>
          )}
        </div>

        {/* Segmented Progress Bar */}
        <div className="pt-1">
          <SegmentedProgress
            value={progressValue}
            variant={progressVariant}
            totalSegments={22}
          />
        </div>
      </CardContent>
    </Card>
  );
};
