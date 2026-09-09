import { Activity, Database, FileText, Users, BarChart3, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import type { AdminStatsTabProps } from "./types";

export const AdminStatsTab = ({ stats, isLoadingStats }: AdminStatsTabProps) => {
    return (
        <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                        <CardDescription>New user registrations over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-72 w-full rounded-lg" />
                        ) : stats?.user_growth && stats.user_growth.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={stats.user_growth}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="label" className="text-xs" tick={{ fill: "var(--muted-foreground)" }} />
                                    <YAxis className="text-xs" tick={{ fill: "var(--muted-foreground)" }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--background)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "8px",
                                        }}
                                        labelStyle={{ color: "var(--foreground)" }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        name="Users"
                                        stroke="var(--chart-1)"
                                        fillOpacity={1}
                                        fill="url(#colorUsers)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                                <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
                                <p className="text-sm font-medium">No info</p>
                                <p className="text-xs text-muted-foreground mt-0.5">No user growth data recorded</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Message Activity</CardTitle>
                        <CardDescription>System-wide messages over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-72 w-full rounded-lg" />
                        ) : stats?.message_activity && stats.message_activity.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.message_activity}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="label" className="text-xs" tick={{ fill: "var(--muted-foreground)" }} />
                                    <YAxis className="text-xs" tick={{ fill: "var(--muted-foreground)" }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--background)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "8px",
                                        }}
                                        labelStyle={{ color: "var(--foreground)" }}
                                        cursor={{ fill: "var(--muted-foreground)", opacity: 0.2, radius: 12 }}
                                    />
                                    <Bar dataKey="value" name="Messages" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                                <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
                                <p className="text-sm font-medium">No info</p>
                                <p className="text-xs text-muted-foreground mt-0.5">No message activity recorded</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-20" />
                        ) : stats?.total_users != null ? (
                            <div className="text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
                        ) : (
                            <div className="text-sm font-medium text-muted-foreground">No info</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-20" />
                        ) : stats?.active_users_24h != null ? (
                            <div className="text-2xl font-bold">{stats.active_users_24h.toLocaleString()}</div>
                        ) : (
                            <div className="text-sm font-medium text-muted-foreground">No info</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-20" />
                        ) : stats?.total_conversations != null ? (
                            <div className="text-2xl font-bold">{stats.total_conversations.toLocaleString()}</div>
                        ) : (
                            <div className="text-sm font-medium text-muted-foreground">No info</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-20" />
                        ) : stats?.total_messages != null ? (
                            <div className="text-2xl font-bold">{stats.total_messages.toLocaleString()}</div>
                        ) : (
                            <div className="text-sm font-medium text-muted-foreground">No info</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
};

