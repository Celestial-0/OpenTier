import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { MessageSquare, Clock, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUserStore } from "@/store/user-store";
import { useChatStore } from "@/store/chat-store";
import { formatDistanceToNow } from "date-fns";

const formatTimeAgo = (timestamp: number) => {
    // Handle seconds vs milliseconds - API usually returns seconds
    const time = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    return formatDistanceToNow(new Date(time), { addSuffix: true });
};

interface OverviewProps {
    onNavigateToConversations: () => void;
}

export const Overview = ({ onNavigateToConversations }: OverviewProps) => {
    const { user, sessions, fetchSessions } = useUserStore();
    const { conversations, totalConversationsCount, fetchConversations } = useChatStore();

    useEffect(() => {
        fetchSessions();
        fetchConversations(true);
    }, [fetchSessions, fetchConversations]);

    // Calculate generic stats
    const totalMessages = conversations.reduce((acc, curr) => acc + curr.message_count, 0);

    // Prepare chart data from top 5 conversations by message count
    const chartData = [...conversations]
        .sort((a, b) => b.message_count - a.message_count)
        .slice(0, 5)
        .map(c => ({
            name: c.title?.slice(0, 15) + (c.title && c.title.length > 15 ? '...' : '') || 'Untitled',
            messages: c.message_count
        }));

    const accountAge = user?.created_at ? formatTimeAgo(new Date(user.created_at).getTime()) : "N/A";

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalConversationsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all time
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalMessages}</div>
                        <p className="text-xs text-muted-foreground">
                            In {conversations.length} recent conversations
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sessions.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Logged in devices
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Account Age</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{accountAge.replace(" ago", "")}</div>
                        <p className="text-xs text-muted-foreground">
                            Member since {user?.created_at ? new Date(user.created_at).getFullYear() : '...'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Top Conversations Chart */}
                <Card className="col-span-2 md:col-span-1">
                    <CardHeader>
                        <CardTitle>Top Conversations</CardTitle>
                        <CardDescription>Most active conversations by message count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="name"
                                        className="text-xs"
                                        tick={{ fill: 'var(--muted-foreground)' }}
                                        height={50}
                                    />
                                    <YAxis
                                        className="text-xs"
                                        tick={{ fill: 'var(--muted-foreground)' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--background)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                        }}
                                        labelStyle={{ color: 'var(--foreground)' }}
                                        cursor={{ fill: 'var(--muted-foreground)', opacity: 0.2, radius: 6 }}
                                    />
                                    <Bar
                                        dataKey="messages"
                                        fill="var(--chart-1)"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                                <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
                                <p>No conversations yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions - Moved up to take space of removed chart */}
                <Card className="col-span-2 md:col-span-1">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common tasks and shortcuts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <Link href="/chat">
                                <Button variant="outline" className="w-full justify-start h-12 text-base">
                                    <MessageSquare className="mr-3 h-5 w-5" />
                                    Start New Chat
                                </Button>
                            </Link>
                            <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={onNavigateToConversations}>
                                <Shield className="mr-3 h-5 w-5" />
                                Manage Sessions
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Conversations */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recent Conversations</CardTitle>
                            <CardDescription>Quick access to your latest chats</CardDescription>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                            {conversations.length} visible
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {conversations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No conversations found. Start a new chat!
                            </div>
                        ) : (
                            conversations.slice(0, 3).map((conversation) => (
                                <Link
                                    key={conversation.id}
                                    href={`/chat?conversation=${conversation.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent hover:border-primary/50 transition-all group"
                                >
                                    <div className="space-y-1 flex-1">
                                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                                            {conversation.title || "Untitled Conversation"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {conversation.message_count} messages · {formatTimeAgo(conversation.updated_at)}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Open
                                    </Button>
                                </Link>
                            ))
                        )}
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                        <Button variant="outline" onClick={onNavigateToConversations} disabled={conversations.length === 0}>
                            View All Conversations →
                        </Button>
                        <Link href="/chat" className={buttonVariants()}>
                            New Conversation
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

