"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Empty,
    EmptyHeader,
    EmptyTitle,
    EmptyDescription,
    EmptyMedia,
} from "@/components/ui/empty";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PlusSignIcon,
    PencilEdit02Icon,
    Delete02Icon,
    StarIcon,
    CheckmarkCircle02Icon,
    CpuIcon,
    AiNetworkIcon,
    RefreshIcon,
    Layers01Icon,
    SlidersHorizontalIcon,
    Alert02Icon,
} from "@hugeicons/core-free-icons";
import type {
    ProviderResponse,
    CatalogModelResponse,
    CreateProviderRequest,
    UpdateProviderRequest,
    CreateModelRequest,
    UpdateModelRequest,
} from "@/lib/api-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminModelsTabProps {
    providers: ProviderResponse[];
    models: CatalogModelResponse[];
    isLoadingProviders: boolean;
    isLoadingModels: boolean;
    isReembedding?: boolean;
    onCreateProvider: (data: CreateProviderRequest) => Promise<void>;
    onUpdateProvider: (id: string, data: UpdateProviderRequest) => Promise<void>;
    onDeleteProvider: (id: string) => Promise<void>;
    onCreateModel: (data: CreateModelRequest) => Promise<void>;
    onUpdateModel: (id: string, data: UpdateModelRequest) => Promise<void>;
    onDeleteModel: (id: string) => Promise<void>;
    onReembedAll?: (modelSlug?: string) => Promise<any>;
}

const emptyProviderForm: CreateProviderRequest = {
    slug: "",
    display_name: "",
    base_url: "",
    api_key: "",
    enabled: true,
};

const emptyModelForm: CreateModelRequest & { fallback_model_id?: string } = {
    provider_id: "",
    slug: "",
    display_name: "",
    kind: "chat",
    context_window: 128000,
    max_output_tokens: 4096,
    dimensions: 768,
    input_cost_per_mtok: 0,
    output_cost_per_mtok: 0,
    fallback_model_id: "none",
    priority: 10,
    enabled: true,
    is_default: false,
};

export const AdminModelsTab = ({
    providers,
    models,
    isLoadingProviders,
    isLoadingModels,
    isReembedding = false,
    onCreateProvider,
    onUpdateProvider,
    onDeleteProvider,
    onCreateModel,
    onUpdateModel,
    onDeleteModel,
    onReembedAll,
}: AdminModelsTabProps) => {
    const [isProviderDialogOpen, setProviderDialogOpen] = useState(false);
    const [isModelDialogOpen, setModelDialogOpen] = useState(false);
    const [isReembedConfirmOpen, setIsReembedConfirmOpen] = useState(false);

    const [providerForm, setProviderForm] = useState<CreateProviderRequest>(emptyProviderForm);
    const [modelForm, setModelForm] = useState<typeof emptyModelForm>(emptyModelForm);

    const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
    const [editingModelId, setEditingModelId] = useState<string | null>(null);
    const [modelFilter, setModelFilter] = useState<"all" | "chat" | "embedding">("all");

    // Filter models by kind
    const chatModels = models.filter((m) => m.kind === "chat");
    const embeddingModels = models.filter((m) => m.kind === "embedding");
    const activeEmbeddingModel =
        embeddingModels.find((m) => m.is_default) || embeddingModels[0];

    const filteredModels = models.filter((m) =>
        modelFilter === "all" ? true : m.kind === modelFilter
    );

    const handleOpenCreateProvider = () => {
        setEditingProviderId(null);
        setProviderForm({ ...emptyProviderForm });
        setProviderDialogOpen(true);
    };

    const handleOpenEditProvider = (p: ProviderResponse) => {
        setEditingProviderId(p.id);
        setProviderForm({
            slug: p.slug,
            display_name: p.display_name,
            base_url: p.base_url,
            api_key: "",
            enabled: p.enabled,
        });
        setProviderDialogOpen(true);
    };

    const handleSaveProvider = async () => {
        if (!providerForm.display_name.trim() || !providerForm.slug.trim()) {
            toast.error("Please enter display name and slug");
            return;
        }
        try {
            if (editingProviderId) {
                await onUpdateProvider(editingProviderId, providerForm as UpdateProviderRequest);
                toast.success("Provider updated successfully");
            } else {
                await onCreateProvider(providerForm);
                toast.success("Provider created successfully");
            }
            setProviderDialogOpen(false);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to save provider");
        }
    };

    const handleOpenCreateModel = (kind: "chat" | "embedding" = "chat") => {
        setEditingModelId(null);
        const defaultProvId = providers[0]?.id || "";
        setModelForm({
            ...emptyModelForm,
            kind,
            provider_id: defaultProvId,
            dimensions: kind === "embedding" ? 768 : undefined,
            context_window: kind === "chat" ? 1048576 : 8192,
            max_output_tokens: kind === "chat" ? 65536 : undefined,
        });
        setModelDialogOpen(true);
    };

    const handleOpenEditModel = (m: CatalogModelResponse) => {
        setEditingModelId(m.id);
        setModelForm({
            provider_id: m.provider_id,
            slug: m.slug,
            display_name: m.display_name,
            kind: m.kind,
            context_window: m.context_window,
            max_output_tokens: m.max_output_tokens ?? undefined,
            dimensions: m.dimensions ?? undefined,
            input_cost_per_mtok: m.input_cost_per_mtok,
            output_cost_per_mtok: m.output_cost_per_mtok,
            fallback_model_id: m.fallback_model_id || "none",
            priority: m.priority,
            enabled: m.enabled,
            is_default: m.is_default,
        });
        setModelDialogOpen(true);
    };

    const handleSaveModel = async () => {
        if (!modelForm.display_name.trim() || !modelForm.slug.trim() || !modelForm.provider_id) {
            toast.error("Please fill in provider, display name, and slug");
            return;
        }
        try {
            const fallbackVal =
                modelForm.fallback_model_id && modelForm.fallback_model_id !== "none"
                    ? modelForm.fallback_model_id
                    : null;

            if (editingModelId) {
                await onUpdateModel(editingModelId, {
                    display_name: modelForm.display_name,
                    context_window: modelForm.context_window,
                    max_output_tokens: modelForm.max_output_tokens,
                    dimensions: modelForm.dimensions,
                    input_cost_per_mtok: modelForm.input_cost_per_mtok,
                    output_cost_per_mtok: modelForm.output_cost_per_mtok,
                    fallback_model_id: fallbackVal,
                    priority: modelForm.priority,
                    enabled: modelForm.enabled,
                    is_default: modelForm.is_default,
                });
                toast.success("Model updated successfully");
            } else {
                await onCreateModel({
                    provider_id: modelForm.provider_id,
                    slug: modelForm.slug,
                    display_name: modelForm.display_name,
                    kind: modelForm.kind,
                    context_window: modelForm.context_window,
                    max_output_tokens: modelForm.max_output_tokens,
                    dimensions: modelForm.dimensions,
                    input_cost_per_mtok: modelForm.input_cost_per_mtok,
                    output_cost_per_mtok: modelForm.output_cost_per_mtok,
                    fallback_model_id: fallbackVal || undefined,
                    priority: modelForm.priority,
                    enabled: modelForm.enabled,
                    is_default: modelForm.is_default,
                });
                toast.success("Model created successfully");
            }
            setModelDialogOpen(false);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to save model");
        }
    };

    const handleSetDefaultEmbedding = async (modelId: string) => {
        try {
            const targetModel = embeddingModels.find((m) => m.id === modelId);
            await onUpdateModel(modelId, { is_default: true, enabled: true });
            toast.success(
                `System embedding switched to ${targetModel?.display_name || "selected model"}. Click "Re-embed All" to align vector collection.`
            );
        } catch (e) {
            toast.error("Failed to switch default embedding model");
        }
    };

    const handleSetDefaultChat = async (modelId: string) => {
        try {
            const targetModel = chatModels.find((m) => m.id === modelId);
            await onUpdateModel(modelId, { is_default: true, enabled: true });
            toast.success(`Default chat model switched to ${targetModel?.display_name || "selected model"}`);
        } catch (e) {
            toast.error("Failed to set default chat model");
        }
    };

    const handleTriggerReembed = async () => {
        if (!onReembedAll) return;
        setIsReembedConfirmOpen(false);
        try {
            toast.info("Re-indexing knowledge base in Qdrant with active embedding model...");
            const res = await onReembedAll(activeEmbeddingModel?.slug);
            toast.success(
                `Successfully re-embedded ${res.reembedded_chunks} chunks into Qdrant (${res.dimensions}d with ${res.model_slug})!`
            );
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Re-embedding failed");
        }
    };

    return (
        <TabsContent value="models" className="flex flex-col gap-6">
            {/* ── 1. SYSTEM-LEVEL ENTITY: EMBEDDING MODEL ── */}
            <Card className="border border-border/60 bg-card shadow-xs">
                <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-border/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={CpuIcon} className="size-4 text-primary shrink-0" />
                                <CardTitle className="text-sm sm:text-base font-semibold">
                                    System Embedding Model
                                </CardTitle>
                                <Badge variant="secondary" className="text-2xs font-semibold px-1.5 py-0">
                                    Active
                                </Badge>
                            </div>
                            <CardDescription className="text-xs">
                                Vector model for knowledge base resources and RAG semantic search.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <AlertDialog open={isReembedConfirmOpen} onOpenChange={setIsReembedConfirmOpen}>
                                <AlertDialogTrigger render={
                                    <Button
                                        variant="default"
                                        size="sm"
                                        disabled={isReembedding || !activeEmbeddingModel}
                                        className="h-8 text-xs font-medium shadow-xs cursor-pointer"
                                    >
                                        <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" className={cn("size-3.5 mr-1.5", isReembedding && "animate-spin")} />
                                        {isReembedding ? "Re-embedding..." : "Re-embed Docs"}
                                    </Button>
                                } />
                                <AlertDialogContent className="sm:max-w-md">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                            <HugeiconsIcon icon={Alert02Icon} className="size-5" /> Re-embed Knowledge Base?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="flex flex-col gap-2 text-xs">
                                            <span>
                                                This recreates the vector index with dimension{" "}
                                                <strong className="text-foreground">{activeEmbeddingModel?.dimensions || 768}d</strong>{" "}
                                                using <strong className="text-foreground">{activeEmbeddingModel?.display_name}</strong>.
                                            </span>
                                            <span>
                                                All stored chunks in the knowledge base will be re-processed.
                                            </span>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleTriggerReembed} className="cursor-pointer">
                                            Proceed & Re-embed
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium cursor-pointer"
                                onClick={() => handleOpenCreateModel("embedding")}
                            >
                                <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" className="size-3.5 mr-1" /> Add Model
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-4">
                    {isLoadingModels ? (
                        <Skeleton className="h-16 w-full rounded-lg" />
                    ) : activeEmbeddingModel ? (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 rounded-lg border border-border/60 bg-muted/20 p-3 sm:p-4 shadow-2xs">
                            {/* Left: Active Model Info with specs */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                    <HugeiconsIcon icon={AiNetworkIcon} className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                            {activeEmbeddingModel.display_name || "Untitled Model"}
                                        </span>
                                        <Badge variant="secondary" className="font-mono text-2xs">
                                            {activeEmbeddingModel.dimensions ? `${activeEmbeddingModel.dimensions}d` : "768d"}
                                        </Badge>
                                        <Badge variant="outline" className="text-2xs font-normal">
                                            {activeEmbeddingModel.provider_display_name || activeEmbeddingModel.provider_slug || "Provider"}
                                        </Badge>
                                    </div>
                                    <span className="text-2xs font-mono text-muted-foreground truncate">
                                        {activeEmbeddingModel.slug}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Switch active model if multiple exist */}
                            {embeddingModels.length > 1 && (
                                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                                    <Label htmlFor="switch-embedding-select" className="text-xs text-muted-foreground whitespace-nowrap">
                                        Switch:
                                    </Label>
                                    <Select
                                        value={activeEmbeddingModel.id}
                                        onValueChange={(v) => {
                                            if (v && v !== activeEmbeddingModel.id) handleSetDefaultEmbedding(v);
                                        }}
                                    >
                                        <SelectTrigger id="switch-embedding-select" className="w-full sm:w-56 h-8 text-xs bg-background">
                                            <SelectValue placeholder="Change default model">
                                                {(val) => {
                                                    const em = embeddingModels.find((m) => m.id === val);
                                                    return em ? em.display_name : val;
                                                }}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {embeddingModels.map((em) => (
                                                <SelectItem key={em.id} value={em.id} className="text-xs">
                                                    {em.display_name} ({em.dimensions || 768}d)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Empty className="py-8 border border-dashed rounded-lg bg-muted/10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon" className="rounded-lg bg-primary/10 text-primary">
                                    <HugeiconsIcon icon={AiNetworkIcon} className="size-4" />
                                </EmptyMedia>
                                <EmptyTitle className="text-sm font-semibold">No Active Embedding Model</EmptyTitle>
                                <EmptyDescription className="text-xs">
                                    Add or enable an embedding model to power RAG semantic search.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </CardContent>
            </Card>

            {/* ── 2. AI PROVIDERS SECTION ── */}
            <Card className="border border-border/60 bg-card shadow-xs">
                <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={Layers01Icon} className="size-4 text-muted-foreground" />
                            <CardTitle className="text-sm sm:text-base font-semibold">AI Providers</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                            API endpoints and authentication credentials.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={handleOpenCreateProvider}
                        size="sm"
                        className="h-8 text-xs font-medium w-full sm:w-auto cursor-pointer"
                    >
                        <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" className="size-3.5 mr-1.5" /> Add Provider
                    </Button>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-4">
                    {isLoadingProviders ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Card key={i} className="border border-border/60 shadow-none p-3.5 flex flex-col gap-2.5">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-24" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                    <Skeleton className="h-4 w-full" />
                                    <div className="pt-2 border-t flex justify-between items-center">
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-6 w-14" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : providers.length === 0 ? (
                        <Empty className="py-8 border border-dashed rounded-lg bg-muted/10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon" className="rounded-lg bg-muted text-muted-foreground">
                                    <HugeiconsIcon icon={Layers01Icon} className="size-4" />
                                </EmptyMedia>
                                <EmptyTitle className="text-sm font-semibold">No AI Providers Configured</EmptyTitle>
                                <EmptyDescription className="text-xs">
                                    Add your first provider to connect models and API endpoints.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {providers.map((p) => {
                                const providerModelCount = models.filter((m) => m.provider_id === p.id).length;
                                return (
                                    <Card
                                        key={p.id}
                                        className="border border-border/60 shadow-2xs hover:border-border transition-colors flex flex-col justify-between"
                                    >
                                        <CardHeader className="p-3.5 pb-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <CardTitle className="text-sm font-semibold truncate text-foreground">
                                                    {p.display_name || "Unknown Provider"}
                                                </CardTitle>
                                                <Badge variant="secondary" className="text-xs font-mono shrink-0">
                                                    {p.slug}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3.5 pt-0 flex flex-col gap-2.5 text-xs">
                                            <div
                                                className="truncate font-mono text-2xs bg-muted/40 px-2 py-1 rounded border border-border/40 text-foreground"
                                                title={p.base_url}
                                            >
                                                {p.base_url || "Default endpoint"}
                                            </div>

                                            <div className="flex items-center justify-between text-2xs">
                                                <div className="flex items-center gap-1.5">
                                                    {p.has_api_key ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-primary border-primary/30 text-2xs flex items-center gap-1 font-normal px-1.5 py-0"
                                                        >
                                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-2.5" /> Key Set
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-muted-foreground text-2xs flex items-center gap-1 font-normal px-1.5 py-0"
                                                        >
                                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-2.5" /> Env Var
                                                        </Badge>
                                                    )}
                                                    <Badge variant="secondary" className="font-mono text-2xs px-1.5 py-0">
                                                        {providerModelCount} {providerModelCount === 1 ? "model" : "models"}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        id={`prov-switch-${p.id}`}
                                                        checked={p.enabled}
                                                        onCheckedChange={(enabled) => onUpdateProvider(p.id, { enabled })}
                                                    />
                                                    <Label
                                                        htmlFor={`prov-switch-${p.id}`}
                                                        className="text-2xs font-medium cursor-pointer text-muted-foreground"
                                                    >
                                                        {p.enabled ? "Active" : "Disabled"}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs cursor-pointer"
                                                        onClick={() => handleOpenEditProvider(p)}
                                                    >
                                                        <HugeiconsIcon icon={PencilEdit02Icon} className="size-3 mr-1" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="size-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                                        onClick={() => onDeleteProvider(p.id)}
                                                    >
                                                        <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── 3. MODELS CATALOG (CHAT & EMBEDDING) ── */}
            <Card className="border border-border/60 bg-card shadow-xs">
                <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={SlidersHorizontalIcon} className="size-4 text-muted-foreground" />
                            <CardTitle className="text-sm sm:text-base font-semibold">Model Catalog</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                            Available models for chat orchestration and vector search.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        {/* Segmented Filter */}
                        <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs flex-1 sm:flex-initial">
                            <button
                                type="button"
                                onClick={() => setModelFilter("all")}
                                className={cn(
                                    "flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer text-center",
                                    modelFilter === "all"
                                        ? "bg-background text-foreground shadow-2xs font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                All ({models.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setModelFilter("chat")}
                                className={cn(
                                    "flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer text-center",
                                    modelFilter === "chat"
                                        ? "bg-background text-foreground shadow-2xs font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Chat ({chatModels.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setModelFilter("embedding")}
                                className={cn(
                                    "flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer text-center",
                                    modelFilter === "embedding"
                                        ? "bg-background text-foreground shadow-2xs font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Embed ({embeddingModels.length})
                            </button>
                        </div>

                        <Button
                            onClick={() => handleOpenCreateModel("chat")}
                            size="sm"
                            className="h-8 text-xs font-medium cursor-pointer shrink-0"
                        >
                            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" className="size-3.5 mr-1.5" /> Add Model
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingModels ? (
                        <>
                            {/* Desktop Loading Skeleton Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b border-border/50 bg-muted/20">
                                            <TableHead className="w-12 text-center py-2.5">Default</TableHead>
                                            <TableHead className="py-2.5">Model</TableHead>
                                            <TableHead className="py-2.5">Type</TableHead>
                                            <TableHead className="py-2.5">Provider</TableHead>
                                            <TableHead className="py-2.5">Specs / Dimensions</TableHead>
                                            <TableHead className="py-2.5">Pricing (cr/Mtok)</TableHead>
                                            <TableHead className="py-2.5">Fallback</TableHead>
                                            <TableHead className="py-2.5">Status</TableHead>
                                            <TableHead className="text-right py-2.5 pr-4">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                                                <TableCell className="text-right pr-4"><Skeleton className="h-7 w-12 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Mobile Loading Skeleton Cards */}
                            <div className="md:hidden flex flex-col gap-2.5 p-3 sm:p-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Card key={i} className="border border-border/60 shadow-none p-3.5 flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                        <Skeleton className="h-4 w-48" />
                                        <div className="pt-2 border-t flex justify-between items-center">
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-6 w-14" />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : filteredModels.length === 0 ? (
                        <Empty className="py-8 border-none bg-transparent">
                            <EmptyHeader>
                                <EmptyMedia variant="icon" className="rounded-lg bg-muted text-muted-foreground">
                                    <HugeiconsIcon icon={SlidersHorizontalIcon} className="size-4" />
                                </EmptyMedia>
                                <EmptyTitle className="text-sm font-semibold">No Models Configured</EmptyTitle>
                                <EmptyDescription className="text-xs">
                                    No {modelFilter === "all" ? "" : modelFilter} models found. Add a model to get started.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <>
                            {/* ── Desktop View: Full Table ── */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b border-border/50 bg-muted/20">
                                            <TableHead className="w-12 text-center py-2.5">Default</TableHead>
                                            <TableHead className="py-2.5">Model</TableHead>
                                            <TableHead className="py-2.5">Type</TableHead>
                                            <TableHead className="py-2.5">Provider</TableHead>
                                            <TableHead className="py-2.5">Specs / Dimensions</TableHead>
                                            <TableHead className="py-2.5">Pricing (cr/Mtok)</TableHead>
                                            <TableHead className="py-2.5">Fallback</TableHead>
                                            <TableHead className="py-2.5">Status</TableHead>
                                            <TableHead className="text-right py-2.5 pr-4">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredModels.map((m) => {
                                            const isEmbedding = m.kind === "embedding";
                                            return (
                                                <TableRow key={m.id} className="hover:bg-muted/30 border-b border-border/40">
                                                    <TableCell className="text-center py-3">
                                                        {m.is_default ? (
                                                            <span title={`Default ${m.kind} model`}>
                                                                <HugeiconsIcon icon={StarIcon} className="size-4 fill-primary text-primary mx-auto" />
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                title={`Set as default ${m.kind} model`}
                                                                onClick={() => isEmbedding ? handleSetDefaultEmbedding(m.id) : handleSetDefaultChat(m.id)}
                                                                className="text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
                                                            >
                                                                <HugeiconsIcon icon={StarIcon} className="size-4 mx-auto" />
                                                            </button>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="font-medium text-xs text-foreground">{m.display_name || "Untitled Model"}</div>
                                                        <span className="text-xs text-muted-foreground font-mono">{m.slug}</span>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Badge
                                                            variant={isEmbedding ? "secondary" : "default"}
                                                            className="text-2xs uppercase tracking-wider font-semibold px-2 py-0.5"
                                                        >
                                                            {m.kind}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            {m.provider_display_name || m.provider_slug || "Provider"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs py-3">
                                                        {isEmbedding ? (
                                                            <Badge variant="secondary" className="font-mono text-xs">
                                                                {m.dimensions || 768}d
                                                            </Badge>
                                                        ) : (
                                                            <div className="flex flex-col gap-0.5">
                                                                <div>{m.context_window ? `${m.context_window.toLocaleString()} ctx` : "—"}</div>
                                                                {m.max_output_tokens && (
                                                                    <span className="text-muted-foreground text-2xs font-mono">
                                                                        {m.max_output_tokens.toLocaleString()} out
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs py-3 font-mono">
                                                        {isEmbedding ? (
                                                            <span className="text-muted-foreground">—</span>
                                                        ) : m.input_cost_per_mtok === 0 && m.output_cost_per_mtok === 0 ? (
                                                            <span className="text-muted-foreground">Free</span>
                                                        ) : (
                                                            <div className="flex flex-col gap-0.5">
                                                                <div>In: {m.input_cost_per_mtok} cr</div>
                                                                <span className="text-muted-foreground">Out: {m.output_cost_per_mtok} cr</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs py-3">
                                                        {m.fallback_slug ? (
                                                            <Badge variant="secondary" className="font-mono text-xs">
                                                                &rarr; {m.fallback_slug}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">None</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Switch
                                                            id={`model-switch-${m.id}`}
                                                            checked={m.enabled}
                                                            onCheckedChange={(enabled) => onUpdateModel(m.id, { enabled })}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right pr-4 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="size-8 p-0 hover:bg-muted cursor-pointer"
                                                                onClick={() => handleOpenEditModel(m)}
                                                                title="Edit model"
                                                            >
                                                                <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="size-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                                                onClick={() => onDeleteModel(m.id)}
                                                                title="Delete model"
                                                            >
                                                                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* ── Mobile View: Clean Responsive Model Cards ── */}
                            <div className="md:hidden flex flex-col gap-2.5 p-3 sm:p-4">
                                {filteredModels.map((m) => {
                                    const isEmbedding = m.kind === "embedding";
                                    return (
                                        <div
                                            key={m.id}
                                            className="rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/20 p-3 flex flex-col gap-2 shadow-2xs transition-colors"
                                        >
                                            {/* Top: Star (default), Name, Slug, Badges */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <button
                                                        type="button"
                                                        title={`Set as default ${m.kind} model`}
                                                        onClick={() => isEmbedding ? handleSetDefaultEmbedding(m.id) : handleSetDefaultChat(m.id)}
                                                        className="shrink-0 cursor-pointer text-muted-foreground/40 hover:text-primary transition-colors"
                                                    >
                                                        <HugeiconsIcon icon={StarIcon} className={cn("size-4", m.is_default && "fill-primary text-primary")} />
                                                    </button>
                                                    <div className="min-w-0 flex flex-col">
                                                        <div className="font-semibold text-xs text-foreground truncate">
                                                            {m.display_name || "Untitled Model"}
                                                        </div>
                                                        <span className="font-mono text-2xs text-muted-foreground truncate">
                                                            {m.slug}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Badge
                                                        variant={isEmbedding ? "secondary" : "default"}
                                                        className="text-2xs uppercase font-semibold px-1.5 py-0"
                                                    >
                                                        {m.kind}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-2xs font-normal px-1.5 py-0">
                                                        {m.provider_display_name || m.provider_slug || "Provider"}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Middle: Spec Chips */}
                                            <div className="flex flex-wrap items-center gap-1.5 text-2xs pt-0.5">
                                                {isEmbedding ? (
                                                    <Badge variant="secondary" className="font-mono text-2xs px-1.5 py-0">
                                                        {m.dimensions || 768}d
                                                    </Badge>
                                                ) : (
                                                    <>
                                                        {m.context_window && (
                                                            <Badge variant="secondary" className="font-mono text-2xs px-1.5 py-0">
                                                                {m.context_window >= 1000000
                                                                    ? `${(m.context_window / 1000000).toFixed(1)}M`
                                                                    : `${Math.round(m.context_window / 1000)}k`} ctx
                                                            </Badge>
                                                        )}
                                                        {m.max_output_tokens && (
                                                            <Badge variant="outline" className="font-mono text-2xs text-muted-foreground px-1.5 py-0">
                                                                {Math.round(m.max_output_tokens / 1000)}k out
                                                            </Badge>
                                                        )}
                                                        <Badge variant="outline" className="font-mono text-2xs px-1.5 py-0">
                                                            {m.input_cost_per_mtok === 0 && m.output_cost_per_mtok === 0
                                                                ? "Free"
                                                                : `${m.input_cost_per_mtok}/${m.output_cost_per_mtok} cr`}
                                                        </Badge>
                                                        {m.fallback_slug && (
                                                            <Badge variant="secondary" className="font-mono text-2xs text-muted-foreground px-1.5 py-0">
                                                                &rarr; {m.fallback_slug}
                                                            </Badge>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Bottom: Status Switch & Actions */}
                                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        id={`mob-model-switch-${m.id}`}
                                                        checked={m.enabled}
                                                        onCheckedChange={(enabled) => onUpdateModel(m.id, { enabled })}
                                                    />
                                                    <Label
                                                        htmlFor={`mob-model-switch-${m.id}`}
                                                        className="text-2xs font-medium cursor-pointer text-muted-foreground"
                                                    >
                                                        {m.enabled ? "Active" : "Disabled"}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs cursor-pointer"
                                                        onClick={() => handleOpenEditModel(m)}
                                                    >
                                                        <HugeiconsIcon icon={PencilEdit02Icon} className="size-3 mr-1" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="size-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                                        onClick={() => onDeleteModel(m.id)}
                                                    >
                                                        <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── PROVIDER DIALOG ── */}
            <Dialog open={isProviderDialogOpen} onOpenChange={setProviderDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingProviderId ? "Edit" : "Add"} AI Provider</DialogTitle>
                        <DialogDescription className="text-xs">
                            Configure base API endpoint and authentication credentials.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="provider-display-name" className="text-xs font-medium">Display Name</Label>
                            <Input
                                id="provider-display-name"
                                className="h-9 text-xs"
                                value={providerForm.display_name || ""}
                                placeholder="e.g. Google AI, OpenAI, Anthropic"
                                onChange={(e) =>
                                    setProviderForm({ ...providerForm, display_name: e.target.value })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="provider-slug" className="text-xs font-medium">Slug</Label>
                            <Input
                                id="provider-slug"
                                className="h-9 text-xs font-mono"
                                value={providerForm.slug || ""}
                                placeholder="e.g. google, openai, anthropic"
                                onChange={(e) =>
                                    setProviderForm({ ...providerForm, slug: e.target.value })
                                }
                                disabled={!!editingProviderId}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="provider-base-url" className="text-xs font-medium">Base URL</Label>
                            <Input
                                id="provider-base-url"
                                className="h-9 text-xs font-mono"
                                value={providerForm.base_url || ""}
                                placeholder="https://generativelanguage.googleapis.com"
                                onChange={(e) =>
                                    setProviderForm({ ...providerForm, base_url: e.target.value })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="provider-api-key" className="text-xs font-medium">API Key (AES-256-GCM Encrypted)</Label>
                            <Input
                                id="provider-api-key"
                                type="password"
                                className="h-9 text-xs font-mono"
                                value={providerForm.api_key || ""}
                                placeholder={editingProviderId ? "Leave blank to keep existing key" : "Enter API key"}
                                onChange={(e) =>
                                    setProviderForm({ ...providerForm, api_key: e.target.value })
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
                            <div className="flex flex-col gap-0.5">
                                <Label htmlFor="provider-enable-switch" className="text-xs font-medium cursor-pointer">
                                    Enable Provider
                                </Label>
                                <p className="text-2xs text-muted-foreground">
                                    Allow models linked to this provider to be used
                                </p>
                            </div>
                            <Switch
                                id="provider-enable-switch"
                                checked={!!providerForm.enabled}
                                onCheckedChange={(c) => setProviderForm({ ...providerForm, enabled: c })}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 pt-2 sm:flex-row flex-col-reverse">
                        <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer" onClick={() => setProviderDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs font-medium cursor-pointer" onClick={handleSaveProvider}>
                            Save Provider
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── MODEL DIALOG ── */}
            <Dialog open={isModelDialogOpen} onOpenChange={setModelDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingModelId ? "Edit" : "Add"}{" "}
                            {modelForm.kind === "embedding" ? "Embedding" : "Chat"} Model
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Configure model specifications, token limits, dimensions, and billing rates.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-1">
                        {/* Provider Select */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium">Provider</Label>
                            <Select
                                value={modelForm.provider_id || ""}
                                onValueChange={(v) =>
                                    setModelForm({ ...modelForm, provider_id: v || "" })
                                }
                                disabled={!!editingModelId}
                            >
                                <SelectTrigger className="w-full h-9 text-xs">
                                    <SelectValue placeholder="Select Provider">
                                        {(val) => {
                                            const p = providers.find((pr) => pr.id === val);
                                            return p ? `${p.display_name} (${p.slug})` : val;
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {providers.map((p) => (
                                        <SelectItem key={p.id} value={p.id} className="text-xs">
                                            {p.display_name} ({p.slug})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Display Name & Slug */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="model-display-name" className="text-xs font-medium">Display Name</Label>
                                <Input
                                    id="model-display-name"
                                    className="h-9 text-xs"
                                    value={modelForm.display_name || ""}
                                    placeholder="e.g. Gemini 3.5 Flash Lite"
                                    onChange={(e) =>
                                        setModelForm({ ...modelForm, display_name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="model-slug" className="text-xs font-medium">Slug (API model identifier)</Label>
                                <Input
                                    id="model-slug"
                                    className="h-9 text-xs font-mono"
                                    value={modelForm.slug || ""}
                                    placeholder="e.g. gemini-3.5-flash-lite, gemini-embedding-2"
                                    onChange={(e) => setModelForm({ ...modelForm, slug: e.target.value })}
                                    disabled={!!editingModelId}
                                />
                            </div>
                        </div>

                        {/* Kind & Fallback/Dimensions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-medium">Kind</Label>
                                <Select
                                    value={modelForm.kind || "chat"}
                                    onValueChange={(v) =>
                                        setModelForm({
                                            ...modelForm,
                                            kind: (v as "chat" | "embedding") || "chat",
                                        })
                                    }
                                    disabled={!!editingModelId}
                                >
                                    <SelectTrigger className="w-full h-9 text-xs">
                                        <SelectValue>
                                            {(val) =>
                                                val === "embedding"
                                                    ? "Embedding (System Level)"
                                                    : "Chat (User Selectable)"
                                            }
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="chat" className="text-xs">Chat (User Selectable)</SelectItem>
                                        <SelectItem value="embedding" className="text-xs">Embedding (System Level)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {modelForm.kind === "embedding" ? (
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="model-dimensions" className="text-xs font-medium">Vector Dimensions</Label>
                                    <Input
                                        id="model-dimensions"
                                        type="number"
                                        className="h-9 text-xs font-mono"
                                        value={modelForm.dimensions ?? 3072}
                                        placeholder="e.g. 3072 for Gemini, 1536 for OpenAI"
                                        onChange={(e) =>
                                            setModelForm({
                                                ...modelForm,
                                                dimensions: parseInt(e.target.value) || 3072,
                                            })
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-xs font-medium">Fallback Model</Label>
                                    <Select
                                        value={modelForm.fallback_model_id || "none"}
                                        onValueChange={(v) =>
                                            setModelForm({
                                                ...modelForm,
                                                fallback_model_id: v || "none",
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-full h-9 text-xs">
                                            <SelectValue placeholder="No Fallback">
                                                {(val) => {
                                                    if (!val || val === "none") return "No Fallback (Terminal)";
                                                    const cm = chatModels.find((m) => m.id === val);
                                                    return cm ? `${cm.display_name} (${cm.slug})` : val;
                                                }}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" className="text-xs">No Fallback (Terminal)</SelectItem>
                                            {chatModels
                                                .filter((cm) => cm.id !== editingModelId)
                                                .map((cm) => (
                                                    <SelectItem key={cm.id} value={cm.id} className="text-xs">
                                                        {cm.display_name} ({cm.slug})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Chat Model Specifications & Cost */}
                        {modelForm.kind !== "embedding" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="model-context" className="text-xs font-medium">Context Window</Label>
                                        <Input
                                            id="model-context"
                                            type="number"
                                            className="h-9 text-xs font-mono"
                                            value={modelForm.context_window ?? 1048576}
                                            onChange={(e) =>
                                                setModelForm({
                                                    ...modelForm,
                                                    context_window: parseInt(e.target.value) || 8192,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="model-max-output" className="text-xs font-medium">Max Output Tokens</Label>
                                        <Input
                                            id="model-max-output"
                                            type="number"
                                            className="h-9 text-xs font-mono"
                                            value={modelForm.max_output_tokens ?? 65536}
                                            onChange={(e) =>
                                                setModelForm({
                                                    ...modelForm,
                                                    max_output_tokens: parseInt(e.target.value) || 4096,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="model-in-cost" className="text-xs font-medium">Input Cost (credits/Mtok)</Label>
                                        <Input
                                            id="model-in-cost"
                                            type="number"
                                            step="0.01"
                                            className="h-9 text-xs font-mono"
                                            value={modelForm.input_cost_per_mtok ?? 0}
                                            onChange={(e) =>
                                                setModelForm({
                                                    ...modelForm,
                                                    input_cost_per_mtok: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="model-out-cost" className="text-xs font-medium">Output Cost (credits/Mtok)</Label>
                                        <Input
                                            id="model-out-cost"
                                            type="number"
                                            step="0.01"
                                            className="h-9 text-xs font-mono"
                                            value={modelForm.output_cost_per_mtok ?? 0}
                                            onChange={(e) =>
                                                setModelForm({
                                                    ...modelForm,
                                                    output_cost_per_mtok: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Status Switches */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 sm:p-3 bg-muted/20">
                                <div className="flex flex-col gap-0.5 pr-2">
                                    <Label htmlFor="model-enable-switch" className="text-xs font-medium cursor-pointer">
                                        Enable Model
                                    </Label>
                                    <p className="text-2xs text-muted-foreground">
                                        Make model available
                                    </p>
                                </div>
                                <Switch
                                    id="model-enable-switch"
                                    checked={!!modelForm.enabled}
                                    onCheckedChange={(c) => setModelForm({ ...modelForm, enabled: c })}
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 sm:p-3 bg-muted/20">
                                <div className="flex flex-col gap-0.5 pr-2">
                                    <Label htmlFor="model-default-switch" className="text-xs font-medium cursor-pointer">
                                        {modelForm.kind === "embedding"
                                            ? "System Default"
                                            : "Default Chat Model"}
                                    </Label>
                                    <p className="text-2xs text-muted-foreground">
                                        {modelForm.kind === "embedding"
                                            ? "Default for embeddings"
                                            : "Pre-select for chat"}
                                    </p>
                                </div>
                                <Switch
                                    id="model-default-switch"
                                    checked={!!modelForm.is_default}
                                    onCheckedChange={(c) => setModelForm({ ...modelForm, is_default: c })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 pt-2 sm:flex-row flex-col-reverse">
                        <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer" onClick={() => setModelDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs font-medium cursor-pointer" onClick={handleSaveModel}>
                            Save Model
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TabsContent>
    );
};
