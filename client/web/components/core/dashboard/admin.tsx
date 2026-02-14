"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Database, BarChart3, Search, Shield, Trash2, FileText, Activity, CheckCircle2, XCircle, AlertCircle, Code, Send, RefreshCw, Copy, Check } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SiRust, SiPython } from "react-icons/si";
import { toast } from "sonner";

import { useQuery } from "@/hooks/use-query";
import { apiClient } from "@/lib/api-client";
import {
    DashboardStats,
    DashboardHealth,
    DashboardUser,
    DashboardResource,
    CreateResourceForm,
    DashboardResourceConfig
} from "@/types/dashboard";
import { useAdmin } from "@/context/admin-context";
import { useAdminStore } from "@/store/admin-store";

// Mock data matching /admin/* API responses
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
    // Admin context and store
    const { isAdmin, fetchStats, fetchUsers, fetchResources, updateUserRole, deleteUser, addResource, deleteResource } = useAdmin();
    const stats = useAdminStore((state) => state.stats);
    const users = useAdminStore((state) => state.users);
    const resources = useAdminStore((state) => state.resources);
    const isLoadingStats = useAdminStore((state) => state.isLoadingStats);
    const isLoadingUsers = useAdminStore((state) => state.isLoadingUsers);
    const isLoadingResources = useAdminStore((state) => state.isLoadingResources);

    // Health checks
    const RustApiHealth = useQuery<DashboardHealth>({
        queryKey: ["rust-api-health"],
        queryFn: () => apiClient<DashboardHealth>("/api/health/api"),
    });
    const PythonApiHealth = useQuery<DashboardHealth>({
        queryKey: ["python-api-health"],
        queryFn: () => apiClient<DashboardHealth>("/api/health/intelligence"),
    });

    // Local state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});

    // Resource form state
    const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
    const [resourceForm, setResourceForm] = useState<CreateResourceForm>({
        resource_type: "url",
        content: "",
        title: "",
        is_global: false,
        config: {
            depth: 2,
            chunk_size: 1000,
            chunk_overlap: 200,
            auto_clean: true,
            generate_embeddings: true,
            follow_links: false,
        },
    });
    const [isSubmittingResource, setIsSubmittingResource] = useState(false);

    // Fetch admin data on mount
    useEffect(() => {
        if (isAdmin) {
            fetchStats();
            fetchUsers();
            fetchResources();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]); // Only re-fetch when isAdmin changes

    // Handle search
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        fetchUsers({ search: query });
    };

    // Handle role update
    const handleRoleUpdate = async (userId: string) => {
        const role = selectedRole[userId];
        if (role) {
            try {
                await updateUserRole(userId, role);
            } catch (error) {
                console.error('Failed to update role:', error);
            }
        }
    };

    // Handle user deletion
    const handleDeleteUser = async (userId: string) => {
        try {
            await deleteUser(userId);
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    };

    // Handle resource deletion
    const handleDeleteResource = async (resourceId: string) => {
        try {
            await deleteResource(resourceId);
        } catch (error) {
            console.error('Failed to delete resource:', error);
        }
    };

    // Handle add resource
    const handleAddResource = async () => {
        if (!resourceForm.content.trim()) {
            return;
        }

        setIsSubmittingResource(true);
        try {
            let content = resourceForm.content;

            // Auto-prefix URLs if protocol is missing
            if (resourceForm.resource_type === 'url') {
                const trimmed = content.trim();
                if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
                    content = `https://${trimmed}`;
                }
            }

            await addResource({
                resource_type: resourceForm.resource_type,
                content: content,
                title: resourceForm.title || undefined,
                config: resourceForm.config,
                is_global: resourceForm.is_global,
            });

            toast.success("Resource added successfully");

            // Reset form and close dialog
            setResourceForm({
                resource_type: "url",
                content: "",
                title: "",
                is_global: false,
                config: {
                    depth: 2,
                    chunk_size: 1000,
                    chunk_overlap: 200,
                    auto_clean: true,
                    generate_embeddings: true,
                    follow_links: false,
                },
            });
            setIsAddResourceOpen(false);
        } catch (error) {
            console.error('Failed to add resource:', error);
            toast.error(error instanceof Error ? error.message : "Failed to add resource");
        } finally {
            setIsSubmittingResource(false);
        }
    };

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
                                    <AreaChart data={[]}>
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
                                    <BarChart data={[]}>
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
                                <div className="text-2xl font-bold">
                                    {isLoadingStats ? "..." : stats?.total_users ?? 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isLoadingStats ? "..." : stats?.active_users_24h ?? 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                                <Database className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isLoadingStats ? "..." : stats?.total_conversations ?? 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isLoadingStats ? "..." : stats?.total_messages ?? 0}
                                </div>
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
                                    onChange={(e) => handleSearch(e.target.value)}
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
                                    {isLoadingUsers ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                Loading users...
                                            </TableCell>
                                        </TableRow>
                                    ) : users.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No users found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.map((user) => (
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
                                                    {new Date(user.created_at).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
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
                                                                    <Select
                                                                        defaultValue={user.role}
                                                                        onValueChange={(value: string | null) => {
                                                                            if (value) setSelectedRole({ ...selectedRole, [user.id]: value });
                                                                        }}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="user">User</SelectItem>
                                                                            <SelectItem value="admin">Admin</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button
                                                                        onClick={() => handleRoleUpdate(user.id)}
                                                                        className="w-full mt-2"
                                                                        disabled={!selectedRole[user.id] || selectedRole[user.id] === user.role}
                                                                    >
                                                                        Update Role
                                                                    </Button>
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
                                                                            <AlertDialogAction
                                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                                onClick={() => handleDeleteUser(user.id)}
                                                                            >
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
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Resources Tab */}
                <TabsContent value="resources" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div className="space-y-1">
                                <CardTitle>Knowledge Base Resources</CardTitle>
                                <CardDescription>
                                    Manage ingested resources and their processing status
                                </CardDescription>
                            </div>
                            <Sheet open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
                                <SheetTrigger render={<Button />}>
                                    <Database className="mr-2 h-4 w-4" />
                                    Add Resource
                                </SheetTrigger>
                                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-4">
                                    <SheetHeader>
                                        <SheetTitle>Add Knowledge Resource</SheetTitle>
                                        <SheetDescription>
                                            Add a URL or text content to the knowledge base for AI retrieval
                                        </SheetDescription>
                                    </SheetHeader>

                                    <div className="space-y-6 py-6">
                                        {/* Resource Type */}
                                        <div className="space-y-2">
                                            <Label htmlFor="resource-type">Resource Type</Label>
                                            <Select
                                                value={resourceForm.resource_type}
                                                onValueChange={(value: string | null) => {
                                                    if (value) setResourceForm({ ...resourceForm, resource_type: value });
                                                }}
                                            >
                                                <SelectTrigger id="resource-type">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="url">URL / Website</SelectItem>
                                                    <SelectItem value="text">Plain Text</SelectItem>
                                                    <SelectItem value="markdown">Markdown</SelectItem>
                                                    <SelectItem value="code">Code</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Content */}
                                        <div className="space-y-2">
                                            <Label htmlFor="content">
                                                {resourceForm.resource_type === "url" ? "URL" : "Content"}
                                            </Label>
                                            <Textarea
                                                id="content"
                                                placeholder={resourceForm.resource_type === "url" ? "https://example.com" : "Enter your content here..."}
                                                value={resourceForm.content}
                                                onChange={(e) => setResourceForm({ ...resourceForm, content: e.target.value })}
                                                rows={resourceForm.resource_type === "url" ? 2 : 8}
                                                className="resize-none"
                                            />
                                        </div>

                                        {/* Title (Optional) */}
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Title (Optional)</Label>
                                            <Input
                                                id="title"
                                                placeholder="Give this resource a memorable name"
                                                value={resourceForm.title}
                                                onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                                            />
                                        </div>

                                        {/* Configuration */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b pb-4 mb-2">
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="is-global">Global Visibility</Label>
                                                    <p className="text-xs text-muted-foreground">Make this resource accessible to all users</p>
                                                </div>
                                                <Switch
                                                    id="is-global"
                                                    checked={resourceForm.is_global}
                                                    onCheckedChange={(checked) =>
                                                        setResourceForm({ ...resourceForm, is_global: checked })
                                                    }
                                                />
                                            </div>

                                            <h4 className="text-sm font-medium">Processing Configuration</h4>

                                            {resourceForm.resource_type === "url" && (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="follow-links">Follow Links</Label>
                                                            <p className="text-xs text-muted-foreground">Crawl linked pages</p>
                                                        </div>
                                                        <Switch
                                                            id="follow-links"
                                                            checked={resourceForm.config.follow_links}
                                                            onCheckedChange={(checked) =>
                                                                setResourceForm({
                                                                    ...resourceForm,
                                                                    config: { ...resourceForm.config, follow_links: checked }
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    {resourceForm.config.follow_links && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="depth">Crawl Depth</Label>
                                                            <Input
                                                                id="depth"
                                                                type="number"
                                                                min="1"
                                                                max="5"
                                                                value={resourceForm.config.depth}
                                                                onChange={(e) =>
                                                                    setResourceForm({
                                                                        ...resourceForm,
                                                                        config: { ...resourceForm.config, depth: parseInt(e.target.value) || 2 }
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="generate-embeddings">Generate Embeddings</Label>
                                                    <p className="text-xs text-muted-foreground">Enable semantic search</p>
                                                </div>
                                                <Switch
                                                    id="generate-embeddings"
                                                    checked={resourceForm.config.generate_embeddings}
                                                    onCheckedChange={(checked) =>
                                                        setResourceForm({
                                                            ...resourceForm,
                                                            config: { ...resourceForm.config, generate_embeddings: checked }
                                                        })
                                                    }
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="auto-clean">Auto Clean</Label>
                                                    <p className="text-xs text-muted-foreground">Remove boilerplate content</p>
                                                </div>
                                                <Switch
                                                    id="auto-clean"
                                                    checked={resourceForm.config.auto_clean}
                                                    onCheckedChange={(checked) =>
                                                        setResourceForm({
                                                            ...resourceForm,
                                                            config: { ...resourceForm.config, auto_clean: checked }
                                                        })
                                                    }
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="chunk-size">Chunk Size</Label>
                                                    <Input
                                                        id="chunk-size"
                                                        type="number"
                                                        min="100"
                                                        max="4000"
                                                        step="100"
                                                        value={resourceForm.config.chunk_size}
                                                        onChange={(e) =>
                                                            setResourceForm({
                                                                ...resourceForm,
                                                                config: { ...resourceForm.config, chunk_size: parseInt(e.target.value) || 1000 }
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="chunk-overlap">Chunk Overlap</Label>
                                                    <Input
                                                        id="chunk-overlap"
                                                        type="number"
                                                        min="0"
                                                        max="500"
                                                        step="50"
                                                        value={resourceForm.config.chunk_overlap}
                                                        onChange={(e) =>
                                                            setResourceForm({
                                                                ...resourceForm,
                                                                config: { ...resourceForm.config, chunk_overlap: parseInt(e.target.value) || 200 }
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <SheetFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsAddResourceOpen(false)}
                                            disabled={isSubmittingResource}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAddResource}
                                            disabled={!resourceForm.content.trim() || isSubmittingResource}
                                        >
                                            {isSubmittingResource ? "Adding..." : "Add Resource"}
                                        </Button>
                                    </SheetFooter>
                                </SheetContent>
                            </Sheet>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Visibility</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Chunks</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingResources ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                Loading resources...
                                            </TableCell>
                                        </TableRow>
                                    ) : resources.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No resources found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        resources.map((resource) => (
                                            <TableRow key={resource.id}>
                                                <TableCell className="font-medium">
                                                    {resource.title ?? resource.metadata?.title ?? resource.id}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        <FileText className="mr-1 h-3 w-3" />
                                                        {resource.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={resource.is_global ? "default" : "secondary"}>
                                                        {resource.is_global ? "Global" : "Private"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(resource.status)}>
                                                        {resource.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{resource.chunks_created}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(resource.created_at * 1000).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
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
                                                                    This will permanently delete "{resource.title ?? resource.metadata?.title ?? resource.id}" and all {resource.chunks_created} associated chunks from the knowledge base.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    onClick={() => handleDeleteResource(resource.id)}
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
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
                                        {RustApiHealth.data?.status === "healthy" ? (
                                            <>
                                                <p className="text-xs text-muted-foreground">{((RustApiHealth.data?.uptime_seconds || 0) / (60 * 60 * 24)).toFixed(2)} days</p>
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                                                    Healthy
                                                </Badge>
                                            </>
                                        ) : RustApiHealth.data?.status === "degraded" ? (
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
                                        {PythonApiHealth.data?.status === "healthy" ? (
                                            <>
                                                <p className="text-xs text-muted-foreground">{((PythonApiHealth.data?.uptime_seconds || 0) / (60 * 60 * 24)).toFixed(2)} days</p>
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                                                    Healthy
                                                </Badge>
                                            </>
                                        ) : PythonApiHealth.data?.status === "degraded" ? (
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
