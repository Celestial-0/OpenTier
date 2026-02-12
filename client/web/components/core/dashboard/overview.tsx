"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Mock data matching API response structures
const mockStats = {
    totalConversations: 12,
    totalMessages: 156,
    activeSessions: 2,
    accountAge: "3 months",
};

const mockRecentConversations = [
    {
        id: "550e8400-e29b-41d4-a716-446655440002",
        title: "Project Planning Discussion",
        message_count: 15,
        updated_at: Date.now() - 3600000, // 1 hour ago
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440003",
        title: "Technical Architecture Review",
        message_count: 8,
        updated_at: Date.now() - 7200000, // 2 hours ago
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440004",
        title: "API Integration Questions",
        message_count: 23,
        updated_at: Date.now() - 86400000, // 1 day ago
    },
];

// Mock activity data for the last 7 days
const mockActivityData = [
    { day: "Mon", messages: 12 },
    { day: "Tue", messages: 19 },
    { day: "Wed", messages: 8 },
    { day: "Thu", messages: 25 },
    { day: "Fri", messages: 18 },
    { day: "Sat", messages: 14 },
    { day: "Sun", messages: 22 },
];

// Mock conversation data for bar chart
const mockConversationData = [
    { name: "Project Planning", messages: 15 },
    { name: "Tech Review", messages: 8 },
    { name: "API Questions", messages: 23 },
    { name: "Bug Fixes", messages: 12 },
    { name: "Feature Ideas", messages: 18 },
];

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

interface OverviewProps {
    onNavigateToConversations: () => void;
}

export const Overview = ({ onNavigateToConversations }: OverviewProps) => {
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
                        <div className="text-2xl font-bold">{mockStats.totalConversations}</div>
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
                        <div className="text-2xl font-bold">{mockStats.totalMessages}</div>
                        <p className="text-xs text-muted-foreground">
                            +12 from last week
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.activeSessions}</div>
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
                        <div className="text-2xl font-bold">{mockStats.accountAge}</div>
                        <p className="text-xs text-muted-foreground">
                            Member since Nov 2025
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Activity Over Time Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Over Time</CardTitle>
                        <CardDescription>Messages sent in the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={mockActivityData}>
                                <defs>
                                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="day"
                                    className="text-xs"
                                    tick={{ fill: 'var(--muted-foreground)' }}
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
                                />
                                <Area
                                    type="monotone"
                                    dataKey="messages"
                                    stroke="var(--chart-1)"
                                    fillOpacity={1}
                                    fill="url(#colorMessages)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Conversations Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Conversations</CardTitle>
                        <CardDescription>Most active conversations by message count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={mockConversationData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="name"
                                    className="text-xs"
                                    tick={{ fill: 'var(--muted-foreground)' }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
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
                            {mockRecentConversations.length} total
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {mockRecentConversations.slice(0, 3).map((conversation) => (
                            <Link
                                key={conversation.id}
                                href={`/chat?conversation=${conversation.id}`}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent hover:border-primary/50 transition-all group"
                            >
                                <div className="space-y-1 flex-1">
                                    <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                                        {conversation.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {conversation.message_count} messages · {formatTimeAgo(conversation.updated_at)}
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open
                                </Button>
                            </Link>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                        <Button variant="outline" onClick={onNavigateToConversations}>
                            View All Conversations →
                        </Button>
                        <Button>
                            <Link href="/chat">
                                New Conversation
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 md:grid-cols-2">
                        <Link href="/chat">
                            <Button variant="outline" className="justify-start">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Start New Chat
                            </Button>
                        </Link>
                        <Button variant="outline" className="justify-start">
                            <Shield className="mr-2 h-4 w-4" />
                            Manage Sessions
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

