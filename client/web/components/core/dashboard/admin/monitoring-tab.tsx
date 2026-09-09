import { Activity, AlertCircle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { SiPython, SiRust } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import type { AdminMonitoringTabProps } from "./types";

export const AdminMonitoringTab = ({
    rustApiHealth,
    pythonApiHealth,
    isLoadingRustApi = false,
    isLoadingPythonApi = false,
}: AdminMonitoringTabProps) => {
    const renderHealthStatus = (
        health: typeof rustApiHealth,
        isLoading: boolean
    ) => {
        if (isLoading) {
            return (
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            );
        }

        if (!health || !health.status) {
            return (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <HelpCircle className="h-4 w-4 opacity-50" />
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-xs">
                        No info
                    </Badge>
                </div>
            );
        }

        const uptime = health.uptime_seconds != null
            ? `${((health.uptime_seconds) / (60 * 60 * 24)).toFixed(2)} days`
            : "No info";

        if (health.status === "healthy") {
            return (
                <>
                    <p className="text-xs text-muted-foreground">{uptime}</p>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                        Healthy
                    </Badge>
                </>
            );
        }

        if (health.status === "degraded") {
            return (
                <>
                    <p className="text-xs text-muted-foreground">{uptime}</p>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                        Degraded
                    </Badge>
                </>
            );
        }

        return (
            <>
                <p className="text-xs text-muted-foreground">{uptime}</p>
                <XCircle className="h-5 w-5 text-red-500" />
                <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">
                    Down
                </Badge>
            </>
        );
    };

    return (
        <TabsContent value="monitoring" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Backend Health Status
                    </CardTitle>
                    <CardDescription>Real-time status of backend services</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-10 w-10 rounded-lg">
                                    <SiRust className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="font-medium">Rust API Layer</p>
                                    <p className="text-xs text-muted-foreground">Core API Services</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 sm:justify-start">
                                {renderHealthStatus(rustApiHealth, isLoadingRustApi)}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-10 w-10 rounded-lg">
                                    <SiPython className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-medium">Python Intelligence Layer</p>
                                    <p className="text-xs text-muted-foreground">AI & ML Services</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 sm:justify-start">
                                {renderHealthStatus(pythonApiHealth, isLoadingPythonApi)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    );
};

