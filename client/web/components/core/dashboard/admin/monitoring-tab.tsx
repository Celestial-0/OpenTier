import { Activity, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { SiPython, SiRust } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import type { AdminMonitoringTabProps } from "./types";

export const AdminMonitoringTab = ({ rustApiHealth, pythonApiHealth }: AdminMonitoringTabProps) => {
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
                                {rustApiHealth?.status === "healthy" ? (
                                    <>
                                        <p className="text-xs text-muted-foreground">
                                            {((rustApiHealth.uptime_seconds || 0) / (60 * 60 * 24)).toFixed(2)} days
                                        </p>
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                                            Healthy
                                        </Badge>
                                    </>
                                ) : rustApiHealth?.status === "degraded" ? (
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
                                {pythonApiHealth?.status === "healthy" ? (
                                    <>
                                        <p className="text-xs text-muted-foreground">
                                            {((pythonApiHealth.uptime_seconds || 0) / (60 * 60 * 24)).toFixed(2)} days
                                        </p>
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                                            Healthy
                                        </Badge>
                                    </>
                                ) : pythonApiHealth?.status === "degraded" ? (
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
    );
};
