"use client";

import { useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    X,
    RefreshCw,
    Layers,
    Inbox,
} from "lucide-react";
import { useAdminStore, type IngestionJob } from "@/store/admin-store";

// ─── helpers ────────────────────────────────────────────────────────────────

function statusIcon(status: string) {
    switch (status) {
        case "queued":
            return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
        case "processing":
            return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
        case "completed":
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case "failed":
            return <XCircle className="h-4 w-4 text-red-500" />;
        case "partial":
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        default:
            return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
}

function statusBadge(status: string) {
    switch (status) {
        case "queued":
            return (
                <Badge variant="outline" className="text-xs border-muted-foreground/40 text-muted-foreground">
                    Queued
                </Badge>
            );
        case "processing":
            return (
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 dark:text-blue-400">
                    Processing
                </Badge>
            );
        case "completed":
            return (
                <Badge variant="outline" className="text-xs border-green-500 text-green-700 dark:text-green-400">
                    Done
                </Badge>
            );
        case "failed":
            return (
                <Badge variant="destructive" className="text-xs">
                    Failed
                </Badge>
            );
        case "partial":
            return (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400">
                    Partial
                </Badge>
            );
        default:
            return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
}

function relativeTime(ms: number) {
    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

// ─── JobRow ─────────────────────────────────────────────────────────────────

function JobRow({ job, onDismiss }: { job: IngestionJob; onDismiss: () => void }) {
    const isActive = job.status === "queued" || job.status === "processing";
    const isDone = job.status === "completed" || job.status === "failed" || job.status === "partial";

    return (
        <div
            className={`
                group relative flex flex-col gap-2 rounded-xl border p-4 transition-all duration-300
                ${isDone ? "opacity-80 hover:opacity-100" : ""}
                ${job.status === "processing" ? "border-blue-500/40 bg-blue-500/5" : ""}
                ${job.status === "queued" ? "border-muted bg-muted/30" : ""}
                ${job.status === "completed" ? "border-green-500/30 bg-green-500/5" : ""}
                ${job.status === "failed" ? "border-red-500/30 bg-red-500/5" : ""}
                ${job.status === "partial" ? "border-yellow-500/30 bg-yellow-500/5" : ""}
            `}
        >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="mt-0.5 shrink-0">
                        {statusIcon(job.status)}
                    </div>
                    <p className="text-sm font-medium truncate" title={job.label}>
                        {job.label}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {statusBadge(job.status)}
                    {isDone && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={onDismiss}
                            title="Dismiss"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress bar — always shown, fills to 100 on completion */}
            <div className="space-y-1">
                <Progress
                    value={
                        job.status === "completed"
                            ? 100
                            : job.status === "failed"
                                ? 100
                                : job.status === "processing"
                                    ? Math.max(job.progress ?? 5, 5)
                                    : 3 // queued — show tiny sliver
                    }
                    className={`h-1.5 transition-all duration-700 ${job.status === "failed" ? "[&>div]:bg-red-500" :
                            job.status === "partial" ? "[&>div]:bg-yellow-500" :
                                job.status === "completed" ? "[&>div]:bg-green-500" :
                                    "[&>div]:bg-blue-500"
                        }`}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {job.chunks_created > 0
                            ? `${job.chunks_created} chunks`
                            : isActive
                                ? "Preparing..."
                                : "—"}
                    </span>
                    <span>{relativeTime(job.created_at)}</span>
                </div>
            </div>

            {/* Error message */}
            {job.error && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-2">
                    {job.error}
                </p>
            )}
        </div>
    );
}

// ─── IngestionQueue ──────────────────────────────────────────────────────────

interface IngestionQueueProps {
    /** If false the component renders nothing (caller controls visibility) */
    visible?: boolean;
}

export function IngestionQueue({ visible = true }: IngestionQueueProps) {
    const jobs = useAdminStore((s) => s.jobs);
    const pollJobs = useAdminStore((s) => s.pollJobs);
    const dismissJob = useAdminStore((s) => s.dismissJob);

    const activeCount = jobs.filter((j) => j.status === "queued" || j.status === "processing").length;

    // Auto-poll while there are active jobs, every 3 seconds
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startPolling = useCallback(() => {
        if (intervalRef.current) return;
        intervalRef.current = setInterval(() => {
            pollJobs();
        }, 3000);
    }, [pollJobs]);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (activeCount > 0) {
            startPolling();
        } else {
            stopPolling();
        }
        return stopPolling;
    }, [activeCount, startPolling, stopPolling]);

    if (!visible) return null;
    if (jobs.length === 0) return null;

    return (
        <Card className="border-dashed">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <CardTitle className="text-base flex items-center gap-2">
                            {activeCount > 0 ? (
                                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                            ) : (
                                <Inbox className="h-4 w-4 text-muted-foreground" />
                            )}
                            Ingestion Queue
                            {activeCount > 0 && (
                                <Badge className="ml-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-1.5 py-0">
                                    {activeCount} running
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {activeCount > 0
                                ? "Auto-refreshing every 3 s while jobs are active"
                                : "All jobs completed — dismiss or add a new resource"}
                        </CardDescription>
                    </div>
                    {activeCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => pollJobs()}
                        >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {jobs.map((job) => (
                        <JobRow
                            key={job.resource_id}
                            job={job}
                            onDismiss={() => dismissJob(job.resource_id)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
