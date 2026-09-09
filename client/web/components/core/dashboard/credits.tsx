"use client";

import { useEffect } from "react";
import {
    Coins,
    TrendingDown,
    Gift,
    Zap,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Cpu,
    ArrowUpRight,
    ArrowDownRight,
    Layers,
    Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreditsStore } from "@/store/credits-store";
import { format } from "date-fns";
import { SegmentedProgress } from "./segmented-progress";

export const CreditsTab = () => {
    const {
        summary,
        transactions,
        totalTransactions,
        transactionLimit,
        transactionOffset,
        selectedReasonFilter,
        modelUsage,
        isLoadingSummary,
        isLoadingTransactions,
        isLoadingModelUsage,
        fetchSummary,
        fetchTransactions,
        fetchModelUsage,
        setReasonFilter,
        setPage,
    } = useCreditsStore();

    useEffect(() => {
        fetchSummary();
        fetchTransactions();
        fetchModelUsage();
    }, [fetchSummary, fetchTransactions, fetchModelUsage]);

    const handleRefreshAll = () => {
        fetchSummary();
        fetchTransactions();
        fetchModelUsage();
    };

    const currentPage = Math.floor(transactionOffset / transactionLimit) + 1;
    const totalPages = Math.max(1, Math.ceil(totalTransactions / transactionLimit));

    const formatTokens = (tokens: number) => {
        if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
        if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
        return tokens.toLocaleString();
    };

    const formatCredits = (amt: number) => {
        return Number(amt).toFixed(2);
    };

    const getReasonBadge = (reason: string) => {
        switch (reason) {
            case "signup_bonus":
                return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">Free Signup</Badge>;
            case "usage":
                return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 font-medium">Chat Usage</Badge>;
            case "admin_adjustment":
                return <Badge variant="secondary" className="font-medium">Adjustment</Badge>;
            case "grant":
                return <Badge variant="outline" className="font-medium">Grant</Badge>;
            case "refund":
                return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">Refund</Badge>;
            default:
                return <Badge variant="outline">{reason}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Top action bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Credits & Billing</h2>
                    <p className="text-sm text-muted-foreground">
                        Monitor your credit balance, token consumption, and per-model AI usage.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAll}
                    disabled={isLoadingSummary || isLoadingTransactions}
                    className="self-start sm:self-auto gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${(isLoadingSummary || isLoadingTransactions) ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Available Balance */}
                <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Coins className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSummary ? (
                            <Skeleton className="h-8 w-28 my-1" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                    {formatCredits(summary?.balance ?? 0)}
                                </span>
                                <span className="text-xs text-muted-foreground uppercase font-mono">credits</span>
                            </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            {summary && summary.held > 0 ? (
                                <span className="inline-flex items-center gap-1 text-primary font-medium">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                    {formatCredits(summary.held)} reserved in flight
                                </span>
                            ) : (
                                <span className="text-muted-foreground">Ready for AI requests</span>
                            )}
                        </div>
                        <div className="pt-3">
                            <SegmentedProgress
                                value={summary?.total_granted ? Math.min(100, Math.round(((summary.balance ?? 0) / summary.total_granted) * 100)) : 80}
                                variant="amber"
                                totalSegments={20}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Lifetime Granted */}
                <Card className="border-border/80">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Granted</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground">
                            <Gift className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSummary ? (
                            <Skeleton className="h-8 w-28 my-1" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                    +{formatCredits(summary?.total_granted ?? 0)}
                                </span>
                                <span className="text-xs text-muted-foreground uppercase font-mono">credits</span>
                            </div>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                            Includes initial signup credits
                        </p>
                        <div className="pt-3">
                            <SegmentedProgress
                                value={100}
                                variant="emerald"
                                totalSegments={20}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Lifetime Spent */}
                <Card className="border-border/80">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Consumed</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground">
                            <TrendingDown className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSummary ? (
                            <Skeleton className="h-8 w-28 my-1" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                    {formatCredits(summary?.total_spent ?? 0)}
                                </span>
                                <span className="text-xs text-muted-foreground uppercase font-mono">credits</span>
                            </div>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                            {summary?.total_messages ?? 0} AI turns processed
                        </p>
                        <div className="pt-3">
                            <SegmentedProgress
                                value={summary?.total_granted ? Math.min(100, Math.round(((summary.total_spent ?? 0) / summary.total_granted) * 100)) : 25}
                                variant="rose"
                                totalSegments={20}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Total Tokens */}
                <Card className="border-border/80">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Tokens Processed</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground">
                            <Zap className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSummary ? (
                            <Skeleton className="h-8 w-28 my-1" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                    {formatTokens((summary?.total_tokens_in ?? 0) + (summary?.total_tokens_out ?? 0))}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">tokens</span>
                            </div>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <ArrowDownRight className="h-3 w-3 text-muted-foreground" />
                                {formatTokens(summary?.total_tokens_in ?? 0)} in
                            </span>
                            <span className="flex items-center gap-1">
                                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                {formatTokens(summary?.total_tokens_out ?? 0)} out
                            </span>
                        </div>
                        <div className="pt-3">
                            <SegmentedProgress
                                value={70}
                                variant="blue"
                                totalSegments={20}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Model Usage Breakdown */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">AI Model Usage Breakdown</CardTitle>
                    </div>
                    <CardDescription>
                        Exact token and credit consumption segmented by generative model.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingModelUsage ? (
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : modelUsage.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm font-medium">No model usage recorded yet</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                Every chat turn will track your prompt & completion tokens and compute accurate credit consumption here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Model</TableHead>
                                        <TableHead className="text-right">Requests</TableHead>
                                        <TableHead className="text-right">Input Tokens</TableHead>
                                        <TableHead className="text-right">Output Tokens</TableHead>
                                        <TableHead className="text-right">Total Credits Burned</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {modelUsage.map((m) => (
                                        <TableRow key={m.model_slug}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {m.model_slug}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground hidden sm:inline">
                                                        {m.model_name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{m.request_count}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {formatTokens(m.tokens_in)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {formatTokens(m.tokens_out)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-destructive">
                                                -{formatCredits(m.total_cost)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Credit Transactions Ledger */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Transaction Ledger</CardTitle>
                            </div>
                            <CardDescription>
                                Immutable record of all credit grants, holds, and usage deductions.
                            </CardDescription>
                        </div>
                        {/* Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground hidden sm:inline">Filter by:</span>
                            <Select
                                value={selectedReasonFilter}
                                onValueChange={(val) => setReasonFilter(val ?? "all")}
                            >
                                <SelectTrigger className="w-40 h-8 text-xs">
                                    <SelectValue placeholder="All reasons" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Transactions</SelectItem>
                                    <SelectItem value="usage">Chat Usage</SelectItem>
                                    <SelectItem value="signup_bonus">Signup Bonus</SelectItem>
                                    <SelectItem value="admin_adjustment">Admin Adjustment</SelectItem>
                                    <SelectItem value="grant">Grant</SelectItem>
                                    <SelectItem value="refund">Refund</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingTransactions ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                            <Coins className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium">No transactions found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedReasonFilter !== "all" ? "No entries match the selected filter." : "Your credit transactions will appear here."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead className="text-right">Tokens (In / Out)</TableHead>
                                            <TableHead className="text-right">Credit Change</TableHead>
                                            <TableHead className="text-right">Balance After</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((tx) => {
                                            const isPositive = tx.delta > 0;
                                            const formattedDate = format(new Date(tx.created_at), "MMM d, yyyy HH:mm:ss");

                                            return (
                                                <TableRow key={tx.id}>
                                                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                        {formattedDate}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getReasonBadge(tx.reason)}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {tx.model_slug ? (
                                                            <span className="font-mono text-muted-foreground">
                                                                {tx.model_slug}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">
                                                                System grant
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                                                        {tx.tokens_in > 0 || tx.tokens_out > 0 ? (
                                                            `${formatTokens(tx.tokens_in)} / ${formatTokens(tx.tokens_out)}`
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </TableCell>
                                                    <TableCell className={`text-right font-mono font-semibold ${isPositive ? "text-primary" : "text-destructive"}`}>
                                                        {isPositive ? `+${formatCredits(tx.delta)}` : formatCredits(tx.delta)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                        {formatCredits(tx.balance_after)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-muted-foreground">
                                    Page {currentPage} of {totalPages} ({totalTransactions} total)
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage <= 1 || isLoadingTransactions}
                                        onClick={() => setPage(currentPage - 1)}
                                        className="h-8 gap-1"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage >= totalPages || isLoadingTransactions}
                                        onClick={() => setPage(currentPage + 1)}
                                        className="h-8 gap-1"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
