'use client';

import { useEffect, useState } from 'react';
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
                    <div className="mb-6 px-4 py-3 rounded-lg border bg-red-500/10 border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {isLoadingQueue ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
                        Loading submissions...
                    </div>
                ) : queueItems.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p className="text-lg">No {queueStatusFilter} submissions</p>
                        <p className="text-sm mt-1">Check back later or change the filter.</p>
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
                                                <h3 className="font-semibold truncate">{item.title}</h3>
                                                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-border bg-accent/50 text-muted-foreground">
                                                    {item.resource_type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                by {item.contributor_name || item.contributor_email || 'Unknown'} ·{' '}
                                                {new Date(item.created_at).toLocaleDateString()}
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
                                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                                                    <span className="font-medium text-amber-400">Feedback:</span>{' '}
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
                                                            className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors text-sm"
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
                                                            className="flex-1 py-2.5 px-4 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-50 transition-colors text-sm"
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
