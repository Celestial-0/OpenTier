'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useContributorStore } from '@/store/contributor-store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const RESOURCE_TYPES = [
    { value: 'text', label: 'Plain Text' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'html', label: 'HTML' },
    { value: 'code', label: 'Code' },
    { value: 'url', label: 'URL' },
];

export const Contributor = () => {
    const {
        title,
        content,
        resourceType,
        submitting,
        submissions,
        isLoadingSubmissions,
        submissionsError,
        message,
        setTitle,
        setContent,
        setResourceType,
        fetchSubmissions,
        submitResource,
    } = useContributorStore();

    const contentSizeMB = (new TextEncoder().encode(content).length / (1024 * 1024)).toFixed(2);

    useEffect(() => {
        void fetchSubmissions();
    }, [fetchSubmissions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submitResource();
        } catch {
            // Error message is captured in contributor store.
        }
    };

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'approved':
                return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500';
            case 'rejected':
                return 'border-red-500/30 bg-red-500/10 text-red-500';
            default:
                return 'border-amber-500/30 bg-amber-500/10 text-amber-500';
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Submit Knowledge Resource</CardTitle>
                    <CardDescription>
                        Share text, markdown, code, or URLs for admin review. Approved submissions are ingested into the
                        shared knowledge base.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {message && (
                        <Alert
                            className={
                                message.type === 'success'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                    : 'border-red-500/30 bg-red-500/10 text-red-600'
                            }
                        >
                            {message.type === 'success' ? (
                                <CheckCircle2 className="size-4" />
                            ) : (
                                <AlertCircle className="size-4" />
                            )}
                            <AlertTitle>{message.type === 'success' ? 'Submitted' : 'Submission failed'}</AlertTitle>
                            <AlertDescription>{message.text}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="submit-title">Title</Label>
                            <Input
                                id="submit-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Give your resource a descriptive title"
                                maxLength={500}
                                required
                            />
                            <p className="text-xs text-muted-foreground">{title.length}/500 characters</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Resource Type</Label>
                            <Select
                                value={resourceType}
                                onValueChange={(value: string | null) => {
                                    if (value) setResourceType(value);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RESOURCE_TYPES.map((rt) => (
                                        <SelectItem key={rt.value} value={rt.value}>
                                            {rt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="submit-content">Content</Label>
                            <Textarea
                                id="submit-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={
                                    resourceType === 'url'
                                        ? 'https://example.com/article'
                                        : 'Paste your content here...'
                                }
                                required
                                rows={14}
                                className="font-mono text-xs"
                            />
                            <div className="flex items-center justify-between">
                                <Badge variant="outline">{contentSizeMB} MB / 10 MB max</Badge>
                                {parseFloat(contentSizeMB) > 9 && (
                                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-500" variant="outline">
                                        Approaching limit
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <Button type="submit" disabled={submitting || !title.trim() || !content.trim()} className="w-full">
                            {submitting && <Loader2 className="animate-spin" />}
                            {submitting ? 'Submitting...' : 'Submit For Review'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Submissions</CardTitle>
                    <CardDescription>
                        Track status and admin feedback for your most recent submissions.
                    </CardDescription>
                    <CardAction>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void fetchSubmissions()}
                            disabled={isLoadingSubmissions}
                        >
                            {isLoadingSubmissions ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                            Refresh
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                    {submissionsError && (
                        <Alert variant="destructive">
                            <AlertCircle className="size-4" />
                            <AlertTitle>Could not load submissions</AlertTitle>
                            <AlertDescription>{submissionsError}</AlertDescription>
                        </Alert>
                    )}

                    {isLoadingSubmissions ? (
                        <div className="space-y-2">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="border-border bg-muted/30 border border-dashed px-4 py-8 text-center text-muted-foreground">
                            You have not submitted any resources yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {submissions.map((submission) => (
                                <Card key={submission.id} size="sm" className="border-border">
                                    <CardHeader className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <CardTitle className="truncate">{submission.title}</CardTitle>
                                            <Badge className={getStatusClasses(submission.status)} variant="outline">
                                                {submission.status}
                                            </Badge>
                                        </div>
                                        <CardDescription>
                                            {submission.resource_type} · {new Date(submission.created_at).toLocaleString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-muted-foreground line-clamp-4 whitespace-pre-wrap wrap-break-word">
                                            {submission.content}
                                        </p>

                                        {submission.admin_feedback && (
                                            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-600">
                                                <AlertCircle className="size-4" />
                                                <AlertTitle>Admin feedback</AlertTitle>
                                                <AlertDescription>{submission.admin_feedback}</AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
