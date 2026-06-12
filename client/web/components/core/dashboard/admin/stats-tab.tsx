import { Activity, Database, FileText, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={stats?.user_growth || []}>
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Message Activity</CardTitle>
                        <CardDescription>System-wide messages over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats?.message_activity || []}>
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
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.total_users ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.active_users_24h ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.total_conversations ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.total_messages ?? 0}</div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
};
