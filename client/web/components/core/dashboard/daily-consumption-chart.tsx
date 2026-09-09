"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreditsStore } from "@/store/credits-store";
import type { CreditTransactionItem } from "@/types/credits";
import { format, subDays, startOfDay } from "date-fns";

export interface DailyDataPoint {
  day: number | string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  messages: number;
}

interface DailyConsumptionChartProps {
  data?: DailyDataPoint[];
  transactions?: CreditTransactionItem[];
  timeRange?: "24h" | "7d" | "30d";
  className?: string;
}

export const DailyConsumptionChart: React.FC<DailyConsumptionChartProps> = ({
  data: propData,
  transactions: propTransactions,
  timeRange = "30d",
  className,
}) => {
  const [metricType, setMetricType] = useState<"tokens" | "cost">("tokens");
  const storeTransactions = useCreditsStore((s) => s.transactions);
  const transactions = propTransactions ?? storeTransactions;

  // Aggregate real transaction data into daily buckets
  const chartData = useMemo(() => {
    if (propData && propData.length > 0) return propData;

    const daysCount = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30;
    const now = new Date();
    const buckets: { [key: string]: DailyDataPoint } = {};
    const dateKeys: string[] = [];

    if (timeRange === "24h") {
      // 6 4-hour buckets
      for (let i = 5; i >= 0; i--) {
        const bucketStart = new Date(now.getTime() - i * 4 * 3600 * 1000);
        const label = format(bucketStart, "ha");
        dateKeys.push(label);
        buckets[label] = {
          day: label,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          messages: 0,
        };
      }

      const cutoff = now.getTime() - 24 * 3600 * 1000;
      for (const tx of transactions) {
        const txTime = new Date(
          typeof tx.created_at === "number"
            ? tx.created_at < 1e12
              ? tx.created_at * 1000
              : tx.created_at
            : tx.created_at
        ).getTime();

        if (txTime >= cutoff) {
          const hoursAgo = Math.floor((now.getTime() - txTime) / (4 * 3600 * 1000));
          const bucketIndex = Math.max(0, Math.min(5, 5 - hoursAgo));
          const key = dateKeys[bucketIndex];
          if (buckets[key]) {
            buckets[key].inputTokens += tx.tokens_in || 0;
            buckets[key].outputTokens += tx.tokens_out || 0;
            const txCost =
              (tx.cost_input || 0) + (tx.cost_output || 0) || Math.abs(tx.delta || 0);
            buckets[key].cost = Number((buckets[key].cost + txCost).toFixed(4));
            if ((tx.tokens_in || 0) > 0 || (tx.tokens_out || 0) > 0) {
              buckets[key].messages += 1;
            }
          }
        }
      }
    } else {
      // 7 or 30 daily buckets
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = subDays(now, i);
        const key = format(d, "yyyy-MM-dd");
        const label = daysCount <= 7 ? format(d, "EEE") : format(d, "d");
        dateKeys.push(key);
        buckets[key] = {
          day: label,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          messages: 0,
        };
      }

      const cutoff = startOfDay(subDays(now, daysCount)).getTime();
      for (const tx of transactions) {
        const txDate = new Date(
          typeof tx.created_at === "number"
            ? tx.created_at < 1e12
              ? tx.created_at * 1000
              : tx.created_at
            : tx.created_at
        );
        if (txDate.getTime() >= cutoff) {
          const key = format(txDate, "yyyy-MM-dd");
          if (buckets[key]) {
            buckets[key].inputTokens += tx.tokens_in || 0;
            buckets[key].outputTokens += tx.tokens_out || 0;
            const txCost =
              (tx.cost_input || 0) + (tx.cost_output || 0) || Math.abs(tx.delta || 0);
            buckets[key].cost = Number((buckets[key].cost + txCost).toFixed(4));
            if ((tx.tokens_in || 0) > 0 || (tx.tokens_out || 0) > 0) {
              buckets[key].messages += 1;
            }
          }
        }
      }
    }

    return dateKeys.map((k) => buckets[k]);
  }, [propData, transactions, timeRange]);

  const hasUsage = useMemo(() => {
    return chartData.some(
      (d) => d.inputTokens > 0 || d.outputTokens > 0 || d.cost > 0
    );
  }, [chartData]);

  const formatYAxis = (val: number) => {
    if (metricType === "cost") {
      return `${val} cr`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
    }
    if (val >= 1_000) {
      return `${Math.round(val / 1_000)}K`;
    }
    return String(val);
  };

  return (
    <Card className={cn("border border-border/60 bg-card/95 shadow-sm", className)}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            {metricType === "tokens" ? "Daily token consumption" : "Daily credit consumption"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {metricType === "tokens"
              ? "Input and output token volume across your workspace"
              : "Credit consumption and expenditure across your workspace"}
          </CardDescription>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Legend Dots */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mr-1">
            {metricType === "tokens" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary ring-2 ring-primary/20" />
                  <span>Input tokens</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary/40 ring-1 ring-border" />
                  <span>Output tokens</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary ring-2 ring-primary/20" />
                <span>Credits consumed</span>
              </div>
            )}
          </div>

          {/* Metric View Toggle */}
          <div className="inline-flex rounded-lg bg-muted/60 p-0.5 border border-border/40">
            <button
              type="button"
              onClick={() => setMetricType("tokens")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                metricType === "tokens"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tokens
            </button>
            <button
              type="button"
              onClick={() => setMetricType("cost")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                metricType === "cost"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Credits
            </button>
          </div>

          {/* Active Period Label */}
          <div className="text-xs font-medium text-muted-foreground border border-border/60 rounded-md px-2.5 py-1 bg-muted/30">
            {timeRange === "24h"
              ? "Last 24 Hours"
              : timeRange === "7d"
              ? "Last 7 Days"
              : "Last 30 Days"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 px-2 sm:px-6">
        {!hasUsage ? (
          <div className="h-72 sm:h-80 w-full flex flex-col items-center justify-center text-center p-6">
            <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
              <Cpu className="size-6 text-muted-foreground/60" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              No token consumption recorded
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Token usage and costs will appear here in real-time as conversations are generated.
            </p>
          </div>
        ) : (
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                barGap={2}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-border/40"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={formatYAxis}
                  dx={-4}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0]?.payload as DailyDataPoint;
                    if (!item) return null;

                    return (
                      <div className="rounded-lg border border-border bg-popover p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-36 text-popover-foreground">
                        <p className="font-semibold text-foreground border-b border-border/40 pb-1">
                          {timeRange === "24h" ? `Time: ${label}` : `Day ${label}`}
                        </p>
                        {metricType === "tokens" ? (
                          <>
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-primary" />
                                Input:
                              </span>
                              <span className="font-medium text-foreground font-mono">
                                {item.inputTokens.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-primary/40" />
                                Output:
                              </span>
                              <span className="font-medium text-foreground font-mono">
                                {item.outputTokens.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-border/40 font-medium text-foreground">
                              <span>Total:</span>
                              <span className="font-mono">
                                {(item.inputTokens + item.outputTokens).toLocaleString()}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>Credits:</span>
                              <span className="font-medium text-primary font-mono">
                                {item.cost.toFixed(4)} cr
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>Messages:</span>
                              <span className="font-medium text-foreground font-mono">
                                {item.messages.toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                {metricType === "tokens" ? (
                  <>
                    <Bar
                      dataKey="inputTokens"
                      name="Input tokens"
                      fill="currentColor"
                      className="fill-primary"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={14}
                    />
                    <Bar
                      dataKey="outputTokens"
                      name="Output tokens"
                      fill="currentColor"
                      className="fill-primary/40"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={14}
                    />
                  </>
                ) : (
                  <Bar
                    dataKey="cost"
                    name="Credits"
                    fill="currentColor"
                    className="fill-primary"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
