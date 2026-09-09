import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon, File01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { IngestionQueue } from "../ingestion-queue";
import { AddResourceDialog } from "./add-resource-dialog";
import type { AdminResourcesTabProps } from "./types";
import { getStatusColor } from "./utils";


export const AdminResourcesTab = ({
    isLoadingResources,
    resources,
    isAddResourceOpen,
    setIsAddResourceOpen,
    resourceForm,
    setResourceForm,
    isSubmittingResource,
    onAddResource,
    onDeleteResource,
}: AdminResourcesTabProps) => {
    return (
        <TabsContent value="resources" className="flex flex-col gap-4">
            <IngestionQueue />

            <Card>
                <CardHeader className="flex flex-col items-start justify-between gap-3 pb-4 sm:flex-row sm:items-center">
                    <div className="flex flex-col gap-1">
                        <CardTitle>Knowledge Base Resources</CardTitle>
                        <CardDescription>Manage ingested resources and their processing status</CardDescription>
                    </div>
                    <Button
                        onClick={() => setIsAddResourceOpen(true)}
                        className="w-full sm:w-auto"
                    >
                        <HugeiconsIcon icon={Database01Icon} className="mr-2 size-4" strokeWidth={2} />
                        Add Resource
                    </Button>
                </CardHeader>

                <AddResourceDialog
                    open={isAddResourceOpen}
                    onOpenChange={setIsAddResourceOpen}
                    resourceForm={resourceForm}
                    setResourceForm={setResourceForm}
                    isSubmitting={isSubmittingResource}
                    onSubmit={onAddResource}
                />
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table className="min-w-190">
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
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-44" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-7 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : resources.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <HugeiconsIcon icon={Database01Icon} className="size-8 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                                        <p className="font-medium text-sm">No info</p>
                                        <p className="text-xs mt-1">No resources found</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                resources.map((resource) => (
                                    <TableRow key={resource.id}>
                                        <TableCell className="font-medium">
                                            {resource.title || resource.metadata?.title || <span className="text-muted-foreground text-xs italic">No info</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                <HugeiconsIcon icon={File01Icon} className="mr-1 size-3" strokeWidth={2} />
                                                {resource.type || "No info"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={resource.is_global ? "default" : "secondary"}>
                                                {resource.is_global ? "Global" : "Private"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(resource.status)}>{resource.status || "No info"}</Badge>
                                        </TableCell>
                                        <TableCell>{resource.chunks_created != null ? resource.chunks_created : "No info"}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {resource.created_at ? new Date(resource.created_at * 1000).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            }) : "No info"}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                                                    <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={2} />
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete &quot;
                                                            {resource.title ?? resource.metadata?.title ?? resource.id}
                                                            &quot; and all {resource.chunks_created} associated chunks from the knowledge base.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={() => onDeleteResource(resource.id)}
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
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    );
};
