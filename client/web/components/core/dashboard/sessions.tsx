"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Laptop, Smartphone, Globe, AlertCircle, Trash2, LogOut, Shield } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUserStore } from "@/store/user-store";

import { DashboardSession } from "@/types/dashboard";
import { MetricCard } from "./metric-card";

export function Sessions() {
    const { sessions, isLoadingSessions, fetchSessions, revokeSession } = useUserStore();
    const [revokingId, setRevokingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleRevoke = async (sessionId: string) => {
        setRevokingId(sessionId);
        await revokeSession(sessionId);
        setRevokingId(null);
    };

    const getDeviceIcon = (deviceType?: string | null) => {
        if (deviceType === "mobile") {
            return <Smartphone className="h-4 w-4 text-muted-foreground" />;
        }
        return <Laptop className="h-4 w-4 text-muted-foreground" />;
    };

    const currentSession = sessions.find((s) => s.is_current) || sessions[0];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Active Sessions & Security</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage your active authenticated devices, IP addresses, and tokens.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchSessions()} disabled={isLoadingSessions}>
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard
                    title="Active Sessions"
                    subtitle="Currently authenticated tokens"
                    value={sessions.length}
                    progressValue={Math.min(100, sessions.length * 20)}
                    progressVariant="emerald"
                />
                <MetricCard
                    title="Current Device"
                    subtitle={
                        currentSession?.ip_address
                            ? `IP: ${currentSession.ip_address}`
                            : "Primary authenticated session"
                    }
                    value={
                        currentSession
                            ? currentSession.device_name || "Web Browser"
                            : "No active sessions"
                    }
                    progressValue={sessions.length > 0 ? 100 : 0}
                    progressVariant="blue"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Devices</CardTitle>
                    <CardDescription>
                        You are currently logged in on these devices.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingSessions ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">Loading sessions...</div>
                    ) : sessions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No active sessions found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Device</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((session: DashboardSession) => {
                                    const isCurrent = Boolean(session.is_current);
                                    const deviceName = session.device_name || (session.user_agent ? "Web Browser" : "Unknown Device");
                                    return (
                                        <TableRow key={session.id}>
                                            <TableCell className="font-medium py-4">
                                                <div className="flex items-center gap-2">
                                                    {getDeviceIcon(session.device_type)}
                                                    <span className="truncate max-w-48 font-medium" title={session.user_agent || deviceName}>
                                                        {deviceName}
                                                    </span>
                                                    {isCurrent && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-normal bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                                            This Device
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-mono text-xs">
                                                        {session.ip_address || "Unknown"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        <TableCell className="py-4">
                                            {format(new Date(session.created_at), "MMM d, yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell className="py-4 text-muted-foreground">
                                            {format(new Date(session.expires_at), "MMM d, yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-right py-4">
                                            <AlertDialog>
                                                <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" />}>
                                                    <LogOut className="h-4 w-4 mr-2" />
                                                    Revoke
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Revoke Session?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to revoke this session? The device will be logged out immediately.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleRevoke(session.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            {revokingId === session.id ? "Revoking..." : "Revoke"}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                <CardContent className="py-4">
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
        </div>
    );
}
