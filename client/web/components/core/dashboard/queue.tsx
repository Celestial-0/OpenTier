'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox } from 'lucide-react';
import { useAdmin } from '@/context/admin-context';
import { useAdminStore } from '@/store/admin-store';


type ReviewState = {
    submissionId: string | null;
    feedback: string;
};

export const Queue = () => {
    const { isAdmin } = useAdmin();
    const {
        queueItems,
        queueTotal,
        isLoadingQueue,
        error,
        queueStatusFilter,
        queueReview,
        setQueueStatusFilter,
        fetchSubmissionQueue,
        reviewSubmissionItem,
    } = useAdminStore();

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [reviewDraft, setReviewDraft] = useState<ReviewState>({
        submissionId: null,
        feedback: '',
    });

    useEffect(() => {
        if (isAdmin) {
            void fetchSubmissionQueue();
        }
    }, [isAdmin, queueStatusFilter, fetchSubmissionQueue]);

    const handleReview = async (
        submissionId: string,
        action: 'approve' | 'reject',
        feedback?: string,
    ) => {
        setReviewDraft({ submissionId, feedback: feedback ?? '' });

        try {
            await reviewSubmissionItem(submissionId, action, feedback);
            setReviewDraft({ submissionId: null, feedback: '' });
            setExpandedId(null);
        } catch {
            // Error is already tracked in the queue store.
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="max-w-6xl mx-auto px-2 py-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Submission Queue</h2>
                        <p className="text-muted-foreground mt-1">
                            Review contributor knowledge submissions ({queueTotal} {queueStatusFilter})
                        </p>
                    </div>
                    <select
                        value={queueStatusFilter}
                        onChange={(e) => setQueueStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 px-4 py-3 rounded-lg border bg-destructive/10 border-destructive/30 text-destructive text-sm">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {isLoadingQueue ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="border border-border rounded-xl p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-6 w-1/3" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-1/4" />
                            </div>
                        ))}
                    </div>
                ) : queueItems.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl">
                        <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="font-medium text-base">No info</p>
                        <p className="text-xs text-muted-foreground mt-1">No {queueStatusFilter} submissions available</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {queueItems.map((item) => {
                            const isExpanded = expandedId === item.id;
                            const isEditingFeedback = reviewDraft.submissionId === item.id;
                            const isReviewing = queueReview.submissionId === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className="border border-border rounded-xl overflow-hidden transition-all hover:border-primary/30"
                                >
                                    {/* Row header */}
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold truncate">{item.title || 'Untitled'}</h3>
                                                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-border bg-accent/50 text-muted-foreground">
                                                    {item.resource_type || 'No info'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                by {item.contributor_name || item.contributor_email || 'No info'} ·{' '}
                                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'No info'}
                                            </p>
                                        </div>

                                        <span className="text-muted-foreground text-sm ml-4">
                                            {isExpanded ? '▲' : '▼'}
                                        </span>
                                    </button>

                                    {/* Expanded content */}
                                    {isExpanded && (
                                        <div className="border-t border-border px-5 py-4 space-y-4">
                                            {/* Content preview */}
                                            <div>
                                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Content Preview</h4>
                                                <pre className="max-h-80 overflow-auto p-4 rounded-lg bg-accent/30 border border-border text-sm font-mono whitespace-pre-wrap wrap-break-word">
                                                    {item.content}
                                                </pre>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {(new TextEncoder().encode(item.content).length / 1024).toFixed(1)} KB
                                                </p>
                                            </div>

                                            {/* Admin feedback (if already reviewed) */}
                                            {item.admin_feedback && (
                                                <div className="p-3 rounded-lg bg-muted border border-border text-sm">
                                                    <span className="font-medium text-foreground">Feedback:</span>{' '}
                                                    {item.admin_feedback}
                                                </div>
                                            )}

                                            {/* Review actions (only for pending) */}
                                            {item.status === 'pending' && (
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={isEditingFeedback ? reviewDraft.feedback : ''}
                                                        onChange={(e) =>
                                                            setReviewDraft((r) => ({
                                                                ...r,
                                                                submissionId: item.id,
                                                                feedback: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Optional feedback for the contributor..."
                                                        rows={2}
                                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                                    />
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            disabled={queueReview.loading}
                                                            onClick={() => handleReview(
                                                                item.id,
                                                                'approve',
                                                                isEditingFeedback ? reviewDraft.feedback : '',
                                                            )}
                                                            className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm cursor-pointer"
                                                        >
                                                            {queueReview.loading && isReviewing && queueReview.action === 'approve'
                                                                ? 'Approving...'
                                                                : '✓ Approve & Ingest'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={queueReview.loading}
                                                            onClick={() => handleReview(
                                                                item.id,
                                                                'reject',
                                                                isEditingFeedback ? reviewDraft.feedback : '',
                                                            )}
                                                            className="flex-1 py-2.5 px-4 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors text-sm cursor-pointer"
                                                        >
                                                            {queueReview.loading && isReviewing && queueReview.action === 'reject'
                                                                ? 'Rejecting...'
                                                                : '✗ Reject'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
