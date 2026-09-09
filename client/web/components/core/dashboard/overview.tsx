"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar as CalendarIcon,
  Download,
  ChevronDown,
  MessageSquare,
  Shield,
  ArrowRight,
  Sparkles,
  Coins,
  Cpu,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useUserStore } from "@/store/user-store";
import { useChatStore } from "@/store/chat-store";
import { useCreditsStore } from "@/store/credits-store";
import { useUi } from "@/context/ui-context";
import { MetricCard } from "./metric-card";
import { DailyConsumptionChart } from "./daily-consumption-chart";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const formatTimeAgo = (timestamp: number | string) => {
  const ms =
    typeof timestamp === "number"
      ? timestamp < 10000000000
        ? timestamp * 1000
        : timestamp
      : new Date(timestamp).getTime();
  return formatDistanceToNow(new Date(ms), { addSuffix: true });
};

export const Overview = () => {
  const { user, sessions, fetchSessions } = useUserStore();
  const { conversations, totalConversationsCount, fetchConversations } = useChatStore();
  const { summary, transactions, fetchSummary, fetchTransactions } = useCreditsStore();
  const { setActiveDashboardView } = useUi();

  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    fetchSessions();
    fetchConversations(true);
    fetchSummary();
    fetchTransactions({ limit: 100 });
  }, [fetchSessions, fetchConversations, fetchSummary, fetchTransactions]);

  // Derived metrics for display
  const totalMessages = useMemo(() => {
    return conversations.reduce((acc, curr) => acc + (curr.message_count || 0), 0);
  }, [conversations]);

  // Total tokens estimate from lifetime summary
  const totalTokens = useMemo(() => {
    if (summary) {
      return (summary.total_tokens_in || 0) + (summary.total_tokens_out || 0);
    }
    return 0;
  }, [summary]);

  const estimatedCost = useMemo(() => {
    if (summary && summary.total_spent > 0) {
      return `$${Number(summary.total_spent).toFixed(2)}`;
    }
    return "$0.00";
  }, [summary]);

  const handleDownloadReport = (format: "json" | "csv") => {
    const reportData = {
      workspace: user?.name ? `${user.name}'s Workspace` : "Personal Workspace",
      timestamp: new Date().toISOString(),
      timeRange,
      metrics: {
        totalConversations: totalConversationsCount,
        totalMessages,
        totalTokens,
        estimatedCost,
        availableBalance: summary ? Number(summary.balance).toFixed(2) : "0.00",
        activeSessions: sessions.length,
      },
      conversations: conversations.slice(0, 10).map((c) => ({
        id: c.id,
        title: c.title,
        messageCount: c.message_count,
        updatedAt: c.updated_at,
      })),
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `opentier-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csvRows = [
        ["Metric", "Value"],
        ["Total Conversations", String(totalConversationsCount)],
        ["Total Messages", String(totalMessages)],
        ["Total Tokens", String(totalTokens)],
        ["Estimated Cost", estimatedCost],
        ["Active Sessions", String(sessions.length)],
      ];
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const a = document.createElement("a");
      a.href = encodedUri;
      a.download = `opentier-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }

    toast.success(`Exported ${format.toUpperCase()} analytics report`);
  };

  return (
    <div className="space-y-6">
      {/* View Header matching Wireframe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            AI Analytics
          </h1>

          {/* Time Range Pills & Calendar Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg bg-muted/60 p-0.5 border border-border/40">
              <button
                type="button"
                onClick={() => setTimeRange("24h")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  timeRange === "24h"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Last 24 hours
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("7d")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  timeRange === "7d"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("30d")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  timeRange === "30d"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Last 30 days
              </button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-8 border-border/60 text-muted-foreground hover:text-foreground"
              aria-label="Pick date range"
              onClick={() => toast.info("Showing current active period")}
            >
              <CalendarIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Download Report Dropdown matching Wireframe */}
        <div className="self-start sm:self-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-9 gap-2 text-xs font-medium border-border/70 shadow-xs"
                >
                  <Download className="size-3.5" />
                  <span>Download Report</span>
                  <ChevronDown className="size-3.5 opacity-60 ml-0.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuItem onClick={() => handleDownloadReport("json")}>
                Download as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadReport("csv")}>
                Download as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Volume */}
        <MetricCard
          title="Volume"
          subtitle={
            summary
              ? `${(summary.total_tokens_in || 0).toLocaleString()} in · ${(summary.total_tokens_out || 0).toLocaleString()} out`
              : "Total tokens consumed"
          }
          value={totalTokens.toLocaleString()}
          progressValue={
            summary && summary.total_tokens_in + summary.total_tokens_out > 0
              ? Math.min(
                  100,
                  Math.round(
                    (summary.total_tokens_in /
                      (summary.total_tokens_in + summary.total_tokens_out)) *
                      100
                  )
                )
              : 0
          }
          progressVariant="emerald"
        />

        {/* Card 2: Activity */}
        <MetricCard
          title="Activity"
          subtitle={`${conversations.length} total conversation${conversations.length === 1 ? "" : "s"}`}
          value={totalMessages.toLocaleString()}
          progressValue={
            conversations.length > 0
              ? Math.min(
                  100,
                  Math.round(
                    (conversations.filter((c) => (c.message_count || 0) > 0).length /
                      conversations.length) *
                      100
                  )
                )
              : 0
          }
          progressVariant="amber"
        />

        {/* Card 3: Cost */}
        <MetricCard
          title="Cost"
          subtitle={
            summary && summary.total_granted > 0
              ? `Lifetime spent of $${Number(summary.total_granted).toFixed(2)} granted`
              : "Total credit expenditure"
          }
          value={estimatedCost}
          progressValue={
            summary && summary.total_granted > 0
              ? Math.min(
                  100,
                  Math.round((summary.total_spent / summary.total_granted) * 100)
                )
              : 0
          }
          progressVariant="emerald"
        />

        {/* Card 4: Available Balance */}
        <MetricCard
          title="Available Balance"
          subtitle={
            summary && summary.held > 0
              ? `$${Number(summary.held).toFixed(2)} held in flight`
              : "Ready for AI requests"
          }
          value={summary ? `$${Number(summary.balance).toFixed(2)}` : "$0.00"}
          progressValue={
            summary && summary.total_granted > 0
              ? Math.min(
                  100,
                  Math.max(
                    0,
                    Math.round((summary.balance / summary.total_granted) * 100)
                  )
                )
              : 0
          }
          progressVariant="blue"
        />
      </div>

      {/* Primary Daily Consumption Chart Card */}
      <DailyConsumptionChart transactions={transactions} timeRange={timeRange} />

      {/* Secondary Row: Top Conversations & Quick Action Shortcuts */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent / Top Conversations (2 Cols) */}
        <Card className="md:col-span-2 border-border/60 bg-card/95 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Conversations
              </CardTitle>
              <CardDescription className="text-xs">
                Quick access to recent AI interactions and message logs
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {conversations.length} chats
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {conversations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-25" />
                <p>No conversations recorded yet. Start a new chat to begin.</p>
              </div>
            ) : (
              conversations.slice(0, 4).map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/chat?conversation=${conversation.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/50 hover:border-primary/40 transition-all group"
                >
                  <div className="space-y-1 min-w-0 pr-3">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {conversation.title || "Untitled Conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conversation.message_count} messages ·{" "}
                      {formatTimeAgo(conversation.updated_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <span>Open</span>
                    <ArrowRight className="size-3 ml-1" />
                  </Button>
                </Link>
              ))
            )}

            <div className="pt-2 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setActiveDashboardView("conversations")}
              >
                View All Conversations
              </Button>
              <Link href="/chat">
                <Button size="sm" className="text-xs h-8 gap-1.5">
                  <Sparkles className="size-3.5" />
                  <span>Start New Chat</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Workspace Status (1 Col) */}
        <Card className="border-border/60 bg-card/95 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-xs">
              Common navigation and account controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 flex-1">
            <Button
              variant="outline"
              className="w-full justify-start h-10 text-xs gap-2.5 border-border hover:bg-accent text-foreground cursor-pointer"
              onClick={() => setActiveDashboardView("credits")}
            >
              <Coins className="size-4 text-muted-foreground" />
              <span>Manage Credits & Billing</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-10 text-xs gap-2.5 border-border hover:bg-accent text-foreground cursor-pointer"
              onClick={() => setActiveDashboardView("sessions")}
            >
              <Shield className="size-4 text-muted-foreground" />
              <span>Active Sessions & Security</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-10 text-xs gap-2.5 border-border hover:bg-accent text-foreground cursor-pointer"
              onClick={() => setActiveDashboardView("settings")}
            >
              <Zap className="size-4 text-muted-foreground" />
              <span>Settings & Preferences</span>
            </Button>

            {user?.role === "admin" && (
              <Button
                variant="outline"
                className="w-full justify-start h-10 text-xs gap-2.5 border-border hover:bg-accent text-foreground cursor-pointer"
                onClick={() => setActiveDashboardView("admin")}
              >
                <Cpu className="size-4 text-muted-foreground" />
                <span>Admin Management Portal</span>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
