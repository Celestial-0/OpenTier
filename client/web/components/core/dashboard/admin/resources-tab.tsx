import { Database, FileText, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { IngestionQueue } from "../ingestion-queue";
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
        <TabsContent value="resources" className="space-y-4">
            <IngestionQueue />

            <Card>
                <CardHeader className="flex flex-col items-start justify-between gap-3 pb-4 sm:flex-row sm:items-center sm:space-y-0">
                    <div className="space-y-1">
                        <CardTitle>Knowledge Base Resources</CardTitle>
                        <CardDescription>Manage ingested resources and their processing status</CardDescription>
                    </div>
                    <Sheet open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
                        <SheetTrigger render={<Button className="w-full sm:w-auto" />}>
                            <Database className="mr-2 h-4 w-4" />
                            Add Resource
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-4">
                            <SheetHeader>
                                <SheetTitle>Add Knowledge Resource</SheetTitle>
                                <SheetDescription>Add a URL or text content to the knowledge base for AI retrieval</SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label htmlFor="resource-type">Resource Type</Label>
                                    <Select
                                        value={resourceForm.resource_type}
                                        onValueChange={(value: string | null) => {
                                            if (!value) {
                                                return;
                                            }

                                            setResourceForm((prev) => ({
                                                ...prev,
                                                resource_type: value,
                                            }));
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

                                <div className="space-y-2">
                                    <Label htmlFor="content">{resourceForm.resource_type === "url" ? "URL" : "Content"}</Label>
                                    <Textarea
                                        id="content"
                                        placeholder={
                                            resourceForm.resource_type === "url" ? "https://example.com" : "Enter your content here..."
                                        }
                                        value={resourceForm.content}
                                        onChange={(e) => {
                                            const nextContent = e.target.value;
                                            setResourceForm((prev) => ({
                                                ...prev,
                                                content: nextContent,
                                            }));
                                        }}
                                        rows={resourceForm.resource_type === "url" ? 2 : 8}
                                        className="resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title">Title (Optional)</Label>
                                    <Input
                                        id="title"
                                        placeholder="Give this resource a memorable name"
                                        value={resourceForm.title}
                                        onChange={(e) => {
                                            const nextTitle = e.target.value;
                                            setResourceForm((prev) => ({
                                                ...prev,
                                                title: nextTitle,
                                            }));
                                        }}
                                    />
                                </div>

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
                                                setResourceForm((prev) => ({
                                                    ...prev,
                                                    is_global: checked,
                                                }))
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
                                                        setResourceForm((prev) => ({
                                                            ...prev,
                                                            config: {
                                                                ...prev.config,
                                                                follow_links: checked,
                                                            },
                                                        }))
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
                                                        onChange={(e) => {
                                                            const nextDepth = parseInt(e.target.value, 10) || 2;
                                                            setResourceForm((prev) => ({
                                                                ...prev,
                                                                config: {
                                                                    ...prev.config,
                                                                    depth: nextDepth,
                                                                },
                                                            }));
                                                        }}
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
                                                setResourceForm((prev) => ({
                                                    ...prev,
                                                    config: {
                                                        ...prev.config,
                                                        generate_embeddings: checked,
                                                    },
                                                }))
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
                                                setResourceForm((prev) => ({
                                                    ...prev,
                                                    config: {
                                                        ...prev.config,
                                                        auto_clean: checked,
                                                    },
                                                }))
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
                                                onChange={(e) => {
                                                    const nextChunkSize = parseInt(e.target.value, 10) || 1000;
                                                    setResourceForm((prev) => ({
                                                        ...prev,
                                                        config: {
                                                            ...prev.config,
                                                            chunk_size: nextChunkSize,
                                                        },
                                                    }));
                                                }}
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
                                                onChange={(e) => {
                                                    const nextChunkOverlap = parseInt(e.target.value, 10) || 200;
                                                    setResourceForm((prev) => ({
                                                        ...prev,
                                                        config: {
                                                            ...prev.config,
                                                            chunk_overlap: nextChunkOverlap,
                                                        },
                                                    }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <SheetFooter>
                                <Button variant="outline" onClick={() => setIsAddResourceOpen(false)} disabled={isSubmittingResource}>
                                    Cancel
                                </Button>
                                <Button onClick={onAddResource} disabled={!resourceForm.content.trim() || isSubmittingResource}>
                                    {isSubmittingResource ? "Adding..." : "Add Resource"}
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </CardHeader>
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
                                        <TableCell className="font-medium">{resource.title ?? resource.metadata?.title ?? resource.id}</TableCell>
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
                                            <Badge className={getStatusColor(resource.status)}>{resource.status}</Badge>
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
