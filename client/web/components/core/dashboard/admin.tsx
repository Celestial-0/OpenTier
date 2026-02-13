"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Database, BarChart3, Search, Shield, Trash2, FileText, Activity, CheckCircle2, XCircle, AlertCircle, Code, Send, RefreshCw, Copy, Check } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SiRust, SiPython } from "react-icons/si";

// Mock data matching /admin/* API responses
const mockSystemStats = {
    total_users: 542,
    active_users_24h: 128,
    verified_users: 521,
    conversations_count: 2150,
    total_messages: 15420,
    active_sessions: 87,
};

const systemHealth = {
    rust_api_layer: "healthy",
    python_intelligence_layer: "healthy",
}

const mockUsers = [
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
        full_name: "John Doe",
        role: "user" as const,
        is_verified: true,
        created_at: 1699920000,
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440001",
        email: "admin@example.com",
        full_name: "Jane Admin",
        role: "admin" as const,
        is_verified: true,
        created_at: 1699920000,
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440008",
        email: "newuser@example.com",
        full_name: null,
        role: "user" as const,
        is_verified: false,
        created_at: 1706484000,
    },
];

const mockResources = [
    {
        resource_id: "550e8400-e29b-41d4-a716-446655440006",
        resource_type: "url",
        title: "OpenTier Documentation",
        status: "completed" as const,
        chunks_created: 15,
        created_at: 1706484000,
        updated_at: 1706485000,
    },
    {
        resource_id: "550e8400-e29b-41d4-a716-446655440009",
        resource_type: "pdf",
        title: "Technical Architecture Guide",
        status: "processing" as const,
        chunks_created: 0,
        created_at: 1706484000,
        updated_at: 1706484000,
    },
    {
        resource_id: "550e8400-e29b-41d4-a716-446655440010",
        resource_type: "markdown",
        title: "API Reference",
        status: "failed" as const,
        chunks_created: 0,
        created_at: 1706484000,
        updated_at: 1706484000,
    },
];

// Mock chart data
const mockUserGrowthData = [
    { month: "Jan", users: 320 },
    { month: "Feb", users: 380 },
    { month: "Mar", users: 420 },
    { month: "Apr", users: 480 },
    { month: "May", users: 520 },
    { month: "Jun", users: 542 },
];

const mockMessageActivityData = [
    { day: "Mon", messages: 1850 },
    { day: "Tue", messages: 2100 },
    { day: "Wed", messages: 1920 },
    { day: "Thu", messages: 2450 },
    { day: "Fri", messages: 2280 },
    { day: "Sat", messages: 1650 },
    { day: "Sun", messages: 2170 },
];

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const getStatusColor = (status: string) => {
    switch (status) {
        case "completed":
            return "bg-green-500";
        case "processing":
            return "bg-yellow-500";
        case "failed":
            return "bg-red-500";
        default:
            return "bg-gray-500";
    }
};

export const Admin = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [curlUrl, setCurlUrl] = useState("");
    const [method, setMethod] = useState("GET");
    const [requestBody, setRequestBody] = useState("");
    const [requestHeaders, setRequestHeaders] = useState("");
    const [curlResponse, setCurlResponse] = useState<string | null>(null);
    const [responseStatus, setResponseStatus] = useState<number | null>(null);
    const [responseTime, setResponseTime] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCurlRequest = async () => {
        if (!curlUrl) return;
        setIsLoading(true);
        setCurlResponse(null);
        setResponseStatus(null);
        setResponseTime(null);

        const startTime = performance.now();

        try {
            let headers = {};
            try {
                if (requestHeaders.trim()) {
                    headers = JSON.parse(requestHeaders);
                }
            } catch (e) {
                console.error("Failed to parse headers", e);
            }

            const options: RequestInit = {
                method: method,
                headers: headers,
            };

            if (method !== "GET" && method !== "HEAD" && requestBody.trim()) {
                options.body = requestBody;
            }

            const response = await fetch(curlUrl, options);
            const endTime = performance.now();
            const timeTaken = (endTime - startTime).toFixed(0) + "ms";

            setResponseStatus(response.status);
            setResponseTime(timeTaken);

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                setCurlResponse(JSON.stringify(data, null, 2));
            } else {
                const text = await response.text();
                setCurlResponse(text);
            }

        } catch (error: any) {
            const endTime = performance.now();
            setResponseTime((endTime - startTime).toFixed(0) + "ms");
            setResponseStatus(0);
            setCurlResponse(`Error: ${error.message || "Network Request Failed"}\n\nNote: This might be due to CORS if you are requesting an external resource.`);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (curlResponse) {
            navigator.clipboard.writeText(curlResponse);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const filteredUsers = mockUsers.filter((user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">

            {/* Admin Tabs */}
            <Tabs defaultValue="stats" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="stats">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Statistics
                    </TabsTrigger>
                    <TabsTrigger value="users">
                        <Users className="mr-2 h-4 w-4" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="resources">
                        <Database className="mr-2 h-4 w-4" />
                        Resources
                    </TabsTrigger>
                    <TabsTrigger value="monitoring">
                        <Activity className="mr-2 h-4 w-4" />
                        Monitoring
                    </TabsTrigger>
                </TabsList>

                {/* Statistics Tab */}
                <TabsContent value="stats" className="space-y-4">
                    {/* Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* User Growth Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>User Growth</CardTitle>
                                <CardDescription>New user registrations over the last 6 months</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={mockUserGrowthData}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis
                                            dataKey="month"
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
                                            dataKey="users"
                                            stroke="var(--chart-1)"
                                            fillOpacity={1}
                                            fill="url(#colorUsers)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Message Activity Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Message Activity</CardTitle>
                                <CardDescription>System-wide messages over the last 7 days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={mockMessageActivityData}>
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
                                            cursor={{ fill: 'var(--muted-foreground)', opacity: 0.2, radius: 12 }}
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

                    {/* Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{mockSystemStats.total_users}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{mockSystemStats.active_users_24h}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{mockSystemStats.verified_users}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                                <Database className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{mockSystemStats.conversations_count}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{mockSystemStats.total_messages}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{mockSystemStats.active_sessions}</div>
                            </CardContent>
                        </Card>
                    </div>


                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>View and manage all users</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users by email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.email}</TableCell>
                                            <TableCell>{user.full_name || "—"}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.is_verified ? "default" : "destructive"} className={user.is_verified ? "bg-green-500" : ""}>
                                                    {user.is_verified ? "Verified" : "Unverified"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDate(user.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger render={<Button variant="ghost" size="sm" />}>
                                                        Manage
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Manage User</DialogTitle>
                                                            <DialogDescription>
                                                                Update user role or delete account
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <p className="text-sm font-medium">Email</p>
                                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <p className="text-sm font-medium">Change Role</p>
                                                                <Select defaultValue={user.role}>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="user">User</SelectItem>
                                                                        <SelectItem value="admin">Admin</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger render={<Button variant="destructive" className="w-full" />}>
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete User
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will permanently delete {user.email} and all associated data. This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Resources Tab */}
                <TabsContent value="resources" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resource Management</CardTitle>
                            <CardDescription>
                                View and manage ingested knowledge base resources
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Chunks</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockResources.map((resource) => (
                                        <TableRow key={resource.resource_id}>
                                            <TableCell className="font-medium">{resource.title}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    <FileText className="mr-1 h-3 w-3" />
                                                    {resource.resource_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(resource.status)}>
                                                    {resource.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{resource.chunks_created}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDate(resource.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently delete "{resource.title}" and all {resource.chunks_created} associated chunks from the knowledge base.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* Monitoring Tab */}
                <TabsContent value="monitoring" className="space-y-4">

                    {/* Backend Health Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Backend Health Status
                            </CardTitle>
                            <CardDescription>
                                Real-time status of backend services
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Rust API Layer */}
                                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-lg">
                                            <SiRust className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Rust API Layer</p>
                                            <p className="text-xs text-muted-foreground">Core API Services</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {systemHealth.rust_api_layer === "healthy" ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                                                    Healthy
                                                </Badge>
                                            </>
                                        ) : systemHealth.rust_api_layer === "degraded" ? (
                                            <>
                                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                                <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                                    Degraded
                                                </Badge>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5 text-red-500" />
                                                <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">
                                                    Down
                                                </Badge>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Python Intelligence Layer */}
                                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-lg">
                                            <SiPython className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Python Intelligence Layer</p>
                                            <p className="text-xs text-muted-foreground">AI & ML Services</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {systemHealth.python_intelligence_layer === "healthy" ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                                                    Healthy
                                                </Badge>
                                            </>
                                        ) : systemHealth.python_intelligence_layer === "degraded" ? (
                                            <>
                                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                                <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                                    Degraded
                                                </Badge>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5 text-red-500" />
                                                <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">
                                                    Down
                                                </Badge>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Admin Footer */}
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                    <CardContent>
                        <div className="flex gap-3">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    Admin Panel
                                </p>
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    You have administrative privileges. Use these tools responsibly.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>



            </Tabs>
        </div>
    );
};
