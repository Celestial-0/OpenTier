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
    Plus,
    Edit,
    Trash,
    Star,
    CheckCircle2,
    Cpu,
    Sparkles,
    RefreshCw,
    Layers,
    Sliders,
    AlertTriangle,
} from "lucide-react";
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
        <TabsContent value="models" className="space-y-6">
            {/* ── 1. SYSTEM-LEVEL ENTITY: EMBEDDING MODEL ── */}
            <Card className="border border-border/60 bg-card shadow-xs">
                <CardHeader className="p-4 pb-3 border-b border-border/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Cpu className="size-4 text-primary" />
                                <CardTitle className="text-base font-semibold">
                                    System Vector Embedding Model
                                </CardTitle>
                                <Badge variant="default" className="text-2xs font-semibold px-2 py-0.5">
                                    System Entity
                                </Badge>
                            </div>
                            <CardDescription className="text-xs">
                                Global vector representation model for knowledge base resources and RAG semantic queries. Changing this updates collection dimensions and requires re-embedding.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <AlertDialog open={isReembedConfirmOpen} onOpenChange={setIsReembedConfirmOpen}>
                                <AlertDialogTrigger render={
                                    <Button
                                        variant="default"
                                        size="sm"
                                        disabled={isReembedding || !activeEmbeddingModel}
                                        className="h-8 text-xs font-medium shadow-xs"
                                    >
                                        <RefreshCw className={cn("size-3.5 mr-1.5", isReembedding && "animate-spin")} />
                                        {isReembedding ? "Re-embedding..." : "Re-embed Documents"}
                                    </Button>
                                } />
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                            <AlertTriangle className="size-5" /> Re-embed Entire Knowledge Base?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="space-y-2 text-xs">
                                            <span className="block">
                                                This action will recreate the Qdrant vector index with dimension{" "}
                                                <strong className="text-foreground">{activeEmbeddingModel?.dimensions || 768}d</strong>{" "}
                                                using model{" "}
                                                <strong className="text-foreground">{activeEmbeddingModel?.display_name}</strong>.
                                            </span>
                                            <span className="block">
                                                All existing chunks stored in PostgreSQL will be re-processed through the embedding pipeline.
                                            </span>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleTriggerReembed}>
                                            Proceed & Re-embed
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => handleOpenCreateModel("embedding")}
                            >
                                <Plus className="size-3.5 mr-1" /> Add Embedding Model
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-4">
                    {isLoadingModels ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-lg" />
                            ))}
                        </div>
                    ) : activeEmbeddingModel ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {/* Card 1: Active Model */}
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 flex flex-col justify-between space-y-2 shadow-2xs">
                                <span className="text-xs font-medium text-muted-foreground">Active Model</span>
                                <div className="space-y-0.5">
                                    <div className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                                        <Sparkles className="size-3.5 text-primary shrink-0" />
                                        <span className="truncate">{activeEmbeddingModel.display_name || "Unknown"}</span>
                                    </div>
                                    <div className="text-xs font-mono text-muted-foreground truncate">
                                        {activeEmbeddingModel.slug || "—"}
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Provider */}
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 flex flex-col justify-between space-y-2 shadow-2xs">
                                <span className="text-xs font-medium text-muted-foreground">Provider</span>
                                <div className="space-y-0.5">
                                    <Badge variant="outline" className="text-xs font-medium w-fit">
                                        {activeEmbeddingModel.provider_display_name || "Default Provider"}
                                    </Badge>
                                    <div className="text-xs font-mono text-muted-foreground truncate">
                                        {activeEmbeddingModel.provider_slug || "provider"}
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Vector Dimensions */}
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 flex flex-col justify-between space-y-2 shadow-2xs">
                                <span className="text-xs font-medium text-muted-foreground">Vector Dimensions</span>
                                <div className="space-y-0.5">
                                    <Badge variant="secondary" className="font-mono text-xs w-fit">
                                        {activeEmbeddingModel.dimensions ? `${activeEmbeddingModel.dimensions} dimensions` : "Not specified"}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground">
                                        Dense vector space in Qdrant
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Switch Active Model */}
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 flex flex-col justify-between space-y-2 shadow-2xs">
                                <span className="text-xs font-medium text-muted-foreground">Switch Active Model</span>
                                <div className="space-y-1">
                                    <Select
                                        value={activeEmbeddingModel.id}
                                        onValueChange={(v) => {
                                            if (v && v !== activeEmbeddingModel.id) handleSetDefaultEmbedding(v);
                                        }}
                                    >
                                        <SelectTrigger className="w-full h-8 text-xs bg-background">
                                            <SelectValue placeholder="Select embedding model">
                                                {(val) => {
                                                    const em = embeddingModels.find((m) => m.id === val);
                                                    return em ? `${em.display_name} ${em.dimensions ? `(${em.dimensions}d)` : ""}` : val;
                                                }}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {embeddingModels.map((em) => (
                                                <SelectItem key={em.id} value={em.id} className="text-xs">
                                                    {em.display_name} {em.dimensions ? `(${em.dimensions}d)` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="text-2xs text-muted-foreground">
                                        Choose default embedding model
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 rounded-lg bg-background border border-dashed text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                            <Sparkles className="size-6 opacity-30 mb-1" />
                            <p className="font-medium text-sm text-foreground">No Active Embedding Model</p>
                            <p className="text-xs">Please add or enable an embedding model to power RAG search.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── 2. AI PROVIDERS SECTION ── */}
            <Card className="border border-border/60 bg-card shadow-xs">
                <CardHeader className="p-4 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Layers className="size-4 text-muted-foreground" />
                            <CardTitle className="text-base font-semibold">AI Providers</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                            Manage API endpoints, credentials, and connectivity for LLM and embedding providers.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={handleOpenCreateProvider}
                        size="sm"
                        className="h-8 text-xs font-medium w-full sm:w-auto"
                    >
                        <Plus className="size-3.5 mr-1.5" /> Add Provider
                    </Button>
                </CardHeader>
                <CardContent className="p-4 pt-4">
                    {isLoadingProviders ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Card key={i} className="border border-border/60 shadow-none p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-28" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-28" />
                                    <div className="pt-2 border-t flex justify-between items-center">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-5 w-10" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : providers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                            <Layers className="size-8 mx-auto mb-2 opacity-30" />
                            <p className="font-medium text-sm text-foreground">No AI Providers Configured</p>
                            <p className="text-xs mt-1">Add your first AI provider to connect models and APIs.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {providers.map((p) => {
                                const providerModelCount = models.filter((m) => m.provider_id === p.id).length;
                                return (
                                    <Card
                                        key={p.id}
                                        className="border border-border/60 shadow-2xs hover:border-border transition-colors flex flex-col justify-between"
                                    >
                                        <CardHeader className="p-4 pb-2 space-y-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <CardTitle className="text-sm font-semibold truncate text-foreground">
                                                    {p.display_name || "Unknown Provider"}
                                                </CardTitle>
                                                <Badge variant="secondary" className="text-xs font-mono shrink-0">
                                                    {p.slug}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-2 space-y-3 text-xs">
                                            <div className="space-y-1">
                                                <span className="text-xs font-medium text-muted-foreground">Endpoint</span>
                                                <div
                                                    className="truncate font-mono text-xs bg-muted/40 px-2.5 py-1.5 rounded-md border border-border/40 text-foreground"
                                                    title={p.base_url}
                                                >
                                                    {p.base_url || "Standard upstream endpoint"}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs pt-1">
                                                <span className="text-muted-foreground font-medium">Authentication</span>
                                                {p.has_api_key ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-primary border-primary/30 text-xs flex items-center gap-1 font-normal"
                                                    >
                                                        <CheckCircle2 className="size-3" /> Encrypted in DB
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-muted-foreground text-xs flex items-center gap-1 font-normal"
                                                    >
                                                        <CheckCircle2 className="size-3" /> Env Var Fallback
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground font-medium">Connected Models</span>
                                                <span className="font-mono text-muted-foreground">
                                                    {providerModelCount} {providerModelCount === 1 ? "model" : "models"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        id={`prov-switch-${p.id}`}
                                                        checked={p.enabled}
                                                        onCheckedChange={(enabled) => onUpdateProvider(p.id, { enabled })}
                                                    />
                                                    <Label
                                                        htmlFor={`prov-switch-${p.id}`}
                                                        className="text-xs font-medium cursor-pointer"
                                                    >
                                                        {p.enabled ? "Active" : "Disabled"}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2.5 text-xs"
                                                        onClick={() => handleOpenEditProvider(p)}
                                                    >
                                                        <Edit className="size-3.5 mr-1" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="size-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => onDeleteProvider(p.id)}
                                                    >
                                                        <Trash className="size-3.5" />
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
                <CardHeader className="p-4 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Sliders className="size-4 text-muted-foreground" />
                            <CardTitle className="text-base font-semibold">Model Catalog</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                            Configured LLM and vector embedding models available for chat orchestration and knowledge indexing.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Segmented Filter */}
                        <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setModelFilter("all")}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
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
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
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
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                                    modelFilter === "embedding"
                                        ? "bg-background text-foreground shadow-2xs font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Embedding ({embeddingModels.length})
                            </button>
                        </div>

                        <Button
                            onClick={() => handleOpenCreateModel("chat")}
                            size="sm"
                            className="h-8 text-xs font-medium"
                        >
                            <Plus className="size-3.5 mr-1.5" /> Add Model
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-border/50 bg-muted/20">
                                <TableHead className="w-12 text-center py-2.5">Default</TableHead>
                                <TableHead className="py-2.5">Model</TableHead>
                                <TableHead className="py-2.5">Type</TableHead>
                                <TableHead className="py-2.5">Provider</TableHead>
                                <TableHead className="py-2.5">Specs / Dimensions</TableHead>
                                <TableHead className="py-2.5">Pricing (/Mtok)</TableHead>
                                <TableHead className="py-2.5">Fallback Chain</TableHead>
                                <TableHead className="py-2.5">Status</TableHead>
                                <TableHead className="text-right py-2.5 pr-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingModels ? (
                                Array.from({ length: 4 }).map((_, i) => (
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
                                ))
                            ) : filteredModels.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                        <Sliders className="size-8 mx-auto mb-2 opacity-30" />
                                        <p className="font-medium text-sm text-foreground">No Models Found</p>
                                        <p className="text-xs mt-1">No {modelFilter === "all" ? "" : modelFilter} models are currently configured.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredModels.map((m) => {
                                    const isEmbedding = m.kind === "embedding";
                                    return (
                                        <TableRow key={m.id} className="hover:bg-muted/30 border-b border-border/40">
                                            <TableCell className="text-center py-3">
                                                {m.is_default ? (
                                                    <span title={`Default ${m.kind} model`}>
                                                        <Star className="size-4 fill-primary text-primary mx-auto" />
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        title={`Set as default ${m.kind} model`}
                                                        onClick={() => isEmbedding ? handleSetDefaultEmbedding(m.id) : handleSetDefaultChat(m.id)}
                                                        className="text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
                                                    >
                                                        <Star className="size-4 mx-auto" />
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
                                                    <div className="space-y-0.5">
                                                        <div>{m.context_window ? `${m.context_window.toLocaleString()} ctx` : "—"}</div>
                                                        {m.max_output_tokens && (
                                                            <div className="text-muted-foreground text-2xs font-mono">
                                                                {m.max_output_tokens.toLocaleString()} out
                                                            </div>
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
                                                    <div className="space-y-0.5">
                                                        <div>In: ${m.input_cost_per_mtok}</div>
                                                        <div className="text-muted-foreground">Out: ${m.output_cost_per_mtok}</div>
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
                                                        className="size-8 p-0 hover:bg-muted"
                                                        onClick={() => handleOpenEditModel(m)}
                                                        title="Edit model"
                                                    >
                                                        <Edit className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="size-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => onDeleteModel(m.id)}
                                                        title="Delete model"
                                                    >
                                                        <Trash className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── PROVIDER DIALOG ── */}
            <Dialog open={isProviderDialogOpen} onOpenChange={setProviderDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingProviderId ? "Edit" : "Add"} AI Provider</DialogTitle>
                        <DialogDescription className="text-xs">
                            Configure base API endpoint and authentication credentials for this provider.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
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
                        <div className="space-y-1.5">
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
                        <div className="space-y-1.5">
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
                        <div className="space-y-1.5">
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
                            <div className="space-y-0.5">
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
                    <DialogFooter className="gap-2 pt-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setProviderDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs font-medium" onClick={handleSaveProvider}>
                            Save Provider
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── MODEL DIALOG ── */}
            <Dialog open={isModelDialogOpen} onOpenChange={setModelDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingModelId ? "Edit" : "Add"}{" "}
                            {modelForm.kind === "embedding" ? "Embedding" : "Chat"} Model
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Configure model specifications, token limits, dimensions, and billing rates.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
                        {/* Provider Select */}
                        <div className="space-y-1.5">
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

                        {/* Display Name */}
                        <div className="space-y-1.5">
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

                        {/* Slug */}
                        <div className="space-y-1.5">
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

                        {/* Kind */}
                        <div className="space-y-1.5">
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
                            <div className="space-y-1.5">
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
                                <p className="text-2xs text-muted-foreground">
                                    Qdrant dense vector size required for indexing documents.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3.5">
                                    <div className="space-y-1.5">
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
                                    <div className="space-y-1.5">
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
                                <div className="grid grid-cols-2 gap-3.5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="model-in-cost" className="text-xs font-medium">Input Cost ($/Mtok)</Label>
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
                                    <div className="space-y-1.5">
                                        <Label htmlFor="model-out-cost" className="text-xs font-medium">Output Cost ($/Mtok)</Label>
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
                                <div className="space-y-1.5">
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
                            </>
                        )}

                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label htmlFor="model-enable-switch" className="text-xs font-medium cursor-pointer">
                                        Enable Model
                                    </Label>
                                    <p className="text-2xs text-muted-foreground">
                                        Make this model available for requests
                                    </p>
                                </div>
                                <Switch
                                    id="model-enable-switch"
                                    checked={!!modelForm.enabled}
                                    onCheckedChange={(c) => setModelForm({ ...modelForm, enabled: c })}
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label htmlFor="model-default-switch" className="text-xs font-medium cursor-pointer">
                                        {modelForm.kind === "embedding"
                                            ? "System Default Embedding Model"
                                            : "Default Chat Model"}
                                    </Label>
                                    <p className="text-2xs text-muted-foreground">
                                        {modelForm.kind === "embedding"
                                            ? "Use as default model for knowledge embeddings"
                                            : "Pre-select for new chat conversations"}
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
                    <DialogFooter className="gap-2 pt-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setModelDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs font-medium" onClick={handleSaveModel}>
                            Save Model
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TabsContent>
    );
};
