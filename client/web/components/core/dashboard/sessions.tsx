"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Monitor, Smartphone, Tablet, Shield, Trash2 } from "lucide-react";

// Mock data matching /user/list-sessions API response
const mockSessions = [
    {
        session_id: "550e8400-e29b-41d4-a716-446655440001",
        created_at: Date.now() - 3600000, // 1 hour ago
        expires_at: Date.now() + 82800000, // 23 hours from now
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        is_current: true,
    },
    {
        session_id: "550e8400-e29b-41d4-a716-446655440007",
        created_at: Date.now() - 86400000, // 1 day ago
        expires_at: Date.now() + 3600000, // 1 hour from now
        ip_address: "192.168.1.105",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
        is_current: false,
    },
];

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes("iPhone") || userAgent.includes("Android")) {
        return <Smartphone className="h-4 w-4" />;
    }
    if (userAgent.includes("iPad") || userAgent.includes("Tablet")) {
        return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
};

const getDeviceInfo = (userAgent: string) => {
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac OS X")) return "macOS";
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("Android")) return "Android";
    return "Unknown";
};

const getBrowserInfo = (userAgent: string) => {
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown";
};

export const Sessions = () => {
    return (
        <div className="space-y-4">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Active Sessions</CardTitle>
                            <CardDescription>
                                Manage your logged-in devices and sessions
                            </CardDescription>
                        </div>
                        <Shield className="h-8 w-8 text-muted-foreground" />
                    </div>
                </CardHeader>
            </Card>

            {/* Sessions Table */}
            <Card>
                <CardContent className="px-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Device</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockSessions.map((session) => (
                                <TableRow key={session.session_id} className="[&>td]:py-4">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {getDeviceIcon(session.user_agent)}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">
                                                        {getDeviceInfo(session.user_agent)} · {getBrowserInfo(session.user_agent)}
                                                    </p>
                                                    {session.is_current && (
                                                        <Badge variant="default" className="text-xs">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 cursor-help">
                                                                {session.user_agent}
                                                            </p>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-sm">
                                                            <p className="text-xs">{session.user_agent}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {session.ip_address}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(session.created_at)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(session.expires_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!session.is_current && (
                                            <AlertDialog>
                                                <AlertDialogTrigger>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Revoke Session?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will sign out the device and invalidate the session. The user will need to sign in again on that device.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Revoke
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                <CardContent>
                    <div className="flex gap-3">
                        <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                                Security Tip
                            </p>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                If you see any sessions you don't recognize, revoke them immediately and consider changing your password.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary */}
            <div className="text-sm text-muted-foreground">
                {mockSessions.length} active session{mockSessions.length !== 1 ? "s" : ""}
            </div>
        </div>
    );
};
