"use client";

import React, { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Globe02Icon,
    File01Icon,
    FileEditIcon,
    CodeIcon,
    SlidersHorizontalIcon,
    SparklesIcon,
    FlashIcon,
    Shield01Icon,
    UserGroupIcon,
    Tick01Icon,
    KeyboardIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { CreateResourceForm } from "@/types/dashboard";

interface AddResourceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resourceForm: CreateResourceForm;
    setResourceForm: React.Dispatch<React.SetStateAction<CreateResourceForm>>;
    isSubmitting: boolean;
    onSubmit: () => Promise<void>;
}

interface ResourceTypeOption {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
}

const RESOURCE_TYPES: ResourceTypeOption[] = [
    {
        id: "url",
        label: "Web URL",
        description: "Crawl web pages, articles, or documentation sites",
        icon: Globe02Icon,
    },
    {
        id: "text",
        label: "Plain Text",
        description: "Raw notes, copy-pasted knowledge, or unstructured text",
        icon: File01Icon,
    },
    {
        id: "markdown",
        label: "Markdown",
        description: "Technical documentation, guides, and structured specs",
        icon: FileEditIcon,
    },
    {
        id: "code",
        label: "Source Code",
        description: "Snippets, schemas, config files, and implementation code",
        icon: CodeIcon,
    },
];

const CHUNK_PRESETS = [
    { label: "Compact", size: 500, overlap: 100, desc: "Quick Q&A" },
    { label: "Balanced", size: 1000, overlap: 200, desc: "Recommended" },
    { label: "Dense", size: 2000, overlap: 300, desc: "Deep context" },
];

export function AddResourceDialog({
    open,
    onOpenChange,
    resourceForm,
    setResourceForm,
    isSubmitting,
    onSubmit,
}: AddResourceDialogProps) {
    const isUrlType = resourceForm.resource_type === "url";

    // Estimated token and word count for text/markdown/code
    const metrics = useMemo(() => {
        if (isUrlType || !resourceForm.content) {
            return { words: 0, estimatedTokens: 0 };
        }
        const text = resourceForm.content.trim();
        const words = text ? text.split(/\s+/).length : 0;
        // Approximation: ~4 chars per token for general English/code
        const estimatedTokens = Math.ceil(text.length / 4);
        return { words, estimatedTokens };
    }, [isUrlType, resourceForm.content]);

    // Handle Ctrl/Cmd + Enter to submit
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            if (resourceForm.content.trim() && !isSubmitting) {
                e.preventDefault();
                onSubmit();
            }
        }
    };

    const actionButtonLabel = useMemo(() => {
        if (isSubmitting) {
            return "Ingesting...";
        }
        switch (resourceForm.resource_type) {
            case "url":
                return "Ingest Web Resource";
            case "markdown":
                return "Index Markdown";
            case "code":
                return "Index Code Snippet";
            default:
                return "Add Knowledge Resource";
        }
    }, [isSubmitting, resourceForm.resource_type]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[calc(100%-1.5rem)] sm:w-full sm:max-w-3xl lg:max-w-4xl max-h-[92dvh] flex flex-col p-0 overflow-hidden rounded-xl border border-border/70 shadow-2xl bg-background [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                onKeyDown={handleKeyDown}
            >
                {/* ── HEADER ── */}
                <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5 bg-muted/20">
                    <div className="flex flex-col gap-1 text-left">
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                                New Knowledge Resource
                            </DialogTitle>
                            <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 border-primary/30 text-primary">
                                RAG Engine
                            </Badge>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Ingest documents, sites, or snippets into OpenTier&apos;s hybrid vector retrieval system.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <Separator />

                {/* ── SCROLLABLE BODY ── */}
                <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <FieldGroup className="flex flex-col gap-5 sm:gap-6">
                        {/* SECTION 1: Resource Type Selector */}
                        <div className="flex flex-col gap-2">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                1. Select Resource Type
                            </FieldLabel>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                {RESOURCE_TYPES.map((type) => {
                                    const isSelected = resourceForm.resource_type === type.id;
                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() =>
                                                setResourceForm((prev) => ({
                                                    ...prev,
                                                    resource_type: type.id,
                                                }))
                                            }
                                            className={cn(
                                                "relative flex flex-col items-start p-3 sm:p-3.5 rounded-lg border text-left transition-all duration-150 cursor-pointer select-none",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40 text-foreground"
                                                    : "border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground"
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full mb-2">
                                                <div
                                                    className={cn(
                                                        "p-1.5 rounded-md transition-colors",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    <HugeiconsIcon icon={type.icon} className="size-4" strokeWidth={2} />
                                                </div>
                                                {isSelected && (
                                                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                        <HugeiconsIcon icon={Tick01Icon} className="size-2.5" strokeWidth={2.5} />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-medium text-xs text-foreground mb-0.5">
                                                {type.label}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                                                {type.description}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SECTION 2: Title & Scope */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <Field className="sm:col-span-2 flex flex-col gap-1.5">
                                <FieldLabel htmlFor="resource-title" className="text-xs font-medium">
                                    Title <span className="text-muted-foreground font-normal">(Optional)</span>
                                </FieldLabel>
                                <Input
                                    id="resource-title"
                                    placeholder={
                                        isUrlType
                                            ? "e.g., Next.js Official Documentation"
                                            : "e.g., Q3 System Architecture & Schema Spec"
                                    }
                                    value={resourceForm.title}
                                    onChange={(e) =>
                                        setResourceForm((prev) => ({
                                            ...prev,
                                            title: e.target.value,
                                        }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </Field>

                            <Field className="flex flex-col gap-1.5">
                                <FieldLabel className="text-xs font-medium">Knowledge Scope</FieldLabel>
                                <div className="flex items-center justify-between h-9 px-3 rounded-md border border-border/60 bg-muted/20">
                                    <div className="flex items-center gap-1.5">
                                        <HugeiconsIcon
                                            icon={resourceForm.is_global ? UserGroupIcon : Shield01Icon}
                                            className={cn(
                                                "size-3.5",
                                                resourceForm.is_global ? "text-primary" : "text-muted-foreground"
                                            )}
                                            strokeWidth={2}
                                        />
                                        <span className="text-xs font-medium">
                                            {resourceForm.is_global ? "Global" : "Private"}
                                        </span>
                                    </div>
                                    <Switch
                                        id="is-global-switch"
                                        checked={resourceForm.is_global}
                                        onCheckedChange={(checked) =>
                                            setResourceForm((prev) => ({
                                                ...prev,
                                                is_global: checked,
                                            }))
                                        }
                                    />
                                </div>
                            </Field>
                        </div>

                        {/* SECTION 3: Content Canvas */}
                        <Field className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <FieldLabel htmlFor="resource-content" className="text-xs font-medium">
                                    {isUrlType ? "Target Website URL" : "Resource Content"}
                                    <span className="text-destructive ml-1">*</span>
                                </FieldLabel>
                                {!isUrlType && metrics.words > 0 && (
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                        <span>{metrics.words.toLocaleString()} words</span>
                                        <span>•</span>
                                        <span>~{metrics.estimatedTokens.toLocaleString()} tokens</span>
                                    </div>
                                )}
                            </div>

                            {isUrlType ? (
                                <InputGroup className="h-10 rounded-md border-border/60">
                                    <InputGroupAddon align="inline-start">
                                        <HugeiconsIcon icon={Globe02Icon} className="size-4 text-muted-foreground" strokeWidth={2} />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        id="resource-content"
                                        type="url"
                                        placeholder="https://docs.example.com/guide or https://github.com/repo"
                                        value={resourceForm.content}
                                        onChange={(e) =>
                                            setResourceForm((prev) => ({
                                                ...prev,
                                                content: e.target.value,
                                            }))
                                        }
                                        className="text-xs font-mono"
                                        autoFocus
                                    />
                                </InputGroup>
                            ) : (
                                <Textarea
                                    id="resource-content"
                                    placeholder={
                                        resourceForm.resource_type === "code"
                                            ? "// Paste code snippets, configs, or queries here..."
                                            : resourceForm.resource_type === "markdown"
                                            ? "# Title\n\nPaste markdown documentation, tables, and notes here..."
                                            : "Paste text content, research notes, or knowledge here..."
                                    }
                                    value={resourceForm.content}
                                    onChange={(e) =>
                                        setResourceForm((prev) => ({
                                            ...prev,
                                            content: e.target.value,
                                        }))
                                    }
                                    rows={8}
                                    className={cn(
                                        "min-h-[180px] sm:min-h-[220px] max-h-[380px] text-xs leading-relaxed resize-y p-3.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                                        (resourceForm.resource_type === "code" ||
                                            resourceForm.resource_type === "markdown") &&
                                            "font-mono"
                                    )}
                                    autoFocus
                                />
                            )}
                        </Field>

                        {/* SECTION 4: Ingestion & Chunking Tuning */}
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 sm:p-4 flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div className="flex items-center gap-2">
                                    <HugeiconsIcon icon={SlidersHorizontalIcon} className="size-4 text-primary" strokeWidth={2} />
                                    <span className="text-xs font-semibold text-foreground">
                                        Processing &amp; Chunking Configuration
                                    </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    3072d Dense + BM25 Sparse
                                </span>
                            </div>

                            {/* URL Specific Options */}
                            {isUrlType && (
                                <div className="flex flex-col gap-3 pt-2 pb-1 border-b border-border/40">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col gap-0.5">
                                            <FieldLabel htmlFor="follow-links-switch" className="text-xs font-medium cursor-pointer">
                                                Follow Internal Links
                                            </FieldLabel>
                                            <FieldDescription className="text-[11px] text-muted-foreground">
                                                Recursively crawl linked subpages within the same domain
                                            </FieldDescription>
                                        </div>
                                        <Switch
                                            id="follow-links-switch"
                                            checked={Boolean(resourceForm.config.follow_links)}
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
                                        <div className="flex items-center justify-between pl-3 sm:pl-4 border-l-2 border-primary/40 py-1 gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <FieldLabel htmlFor="crawl-depth" className="text-xs font-medium">
                                                    Maximum Crawl Depth
                                                </FieldLabel>
                                                <FieldDescription className="text-[11px] text-muted-foreground">
                                                    Hops from root URL (1 to 5 levels)
                                                </FieldDescription>
                                            </div>
                                            <div className="w-20 sm:w-24">
                                                <Input
                                                    id="crawl-depth"
                                                    type="number"
                                                    min={1}
                                                    max={5}
                                                    value={resourceForm.config.depth || 2}
                                                    onChange={(e) => {
                                                        const depth = parseInt(e.target.value, 10) || 2;
                                                        setResourceForm((prev) => ({
                                                            ...prev,
                                                            config: {
                                                                ...prev.config,
                                                                depth,
                                                            },
                                                        }));
                                                    }}
                                                    className="h-8 text-xs font-mono text-center"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* General Switches */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="flex items-center justify-between p-2.5 rounded-md bg-background border border-border/40">
                                    <div className="flex flex-col gap-0.5 pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <HugeiconsIcon icon={SparklesIcon} className="size-3.5 text-primary" strokeWidth={2} />
                                            <FieldLabel htmlFor="embeddings-switch" className="text-xs font-medium cursor-pointer">
                                                Vector Embeddings
                                            </FieldLabel>
                                        </div>
                                        <FieldDescription className="text-[11px] text-muted-foreground">
                                            Index chunks into Qdrant for semantic search
                                        </FieldDescription>
                                    </div>
                                    <Switch
                                        id="embeddings-switch"
                                        checked={resourceForm.config.generate_embeddings ?? true}
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

                                <div className="flex items-center justify-between p-2.5 rounded-md bg-background border border-border/40">
                                    <div className="flex flex-col gap-0.5 pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <HugeiconsIcon icon={FlashIcon} className="size-3.5 text-amber-500" strokeWidth={2} />
                                            <FieldLabel htmlFor="auto-clean-switch" className="text-xs font-medium cursor-pointer">
                                                Auto-Clean Noise
                                            </FieldLabel>
                                        </div>
                                        <FieldDescription className="text-[11px] text-muted-foreground">
                                            Strip boilerplates, headers, and navigation clutter
                                        </FieldDescription>
                                    </div>
                                    <Switch
                                        id="auto-clean-switch"
                                        checked={resourceForm.config.auto_clean ?? true}
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
                            </div>

                            {/* Chunk Size and Overlap Presets */}
                            <div className="flex flex-col gap-2 pt-1">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <FieldLabel className="text-xs font-medium">Chunk Partitioning Presets</FieldLabel>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {CHUNK_PRESETS.map((preset) => {
                                            const isMatch =
                                                resourceForm.config.chunk_size === preset.size &&
                                                resourceForm.config.chunk_overlap === preset.overlap;
                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() =>
                                                        setResourceForm((prev) => ({
                                                            ...prev,
                                                            config: {
                                                                ...prev.config,
                                                                chunk_size: preset.size,
                                                                chunk_overlap: preset.overlap,
                                                            },
                                                        }))
                                                    }
                                                    className={cn(
                                                        "px-2 py-0.5 rounded text-[11px] transition-colors font-mono cursor-pointer border",
                                                        isMatch
                                                            ? "bg-primary text-primary-foreground border-primary font-medium"
                                                            : "bg-background text-muted-foreground border-border/60 hover:border-foreground/30 hover:text-foreground"
                                                    )}
                                                >
                                                    {preset.label} ({preset.size}/{preset.overlap})
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Field className="flex flex-col gap-1">
                                        <FieldLabel htmlFor="chunk-size-input" className="text-[11px] text-muted-foreground">
                                            Chunk Size (tokens)
                                        </FieldLabel>
                                        <Input
                                            id="chunk-size-input"
                                            type="number"
                                            min={100}
                                            max={4000}
                                            step={100}
                                            value={resourceForm.config.chunk_size ?? 1000}
                                            onChange={(e) => {
                                                const chunk_size = parseInt(e.target.value, 10) || 1000;
                                                setResourceForm((prev) => ({
                                                    ...prev,
                                                    config: {
                                                        ...prev.config,
                                                        chunk_size,
                                                    },
                                                }));
                                            }}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </Field>

                                    <Field className="flex flex-col gap-1">
                                        <FieldLabel htmlFor="chunk-overlap-input" className="text-[11px] text-muted-foreground">
                                            Chunk Overlap (tokens)
                                        </FieldLabel>
                                        <Input
                                            id="chunk-overlap-input"
                                            type="number"
                                            min={0}
                                            max={500}
                                            step={50}
                                            value={resourceForm.config.chunk_overlap ?? 200}
                                            onChange={(e) => {
                                                const chunk_overlap = parseInt(e.target.value, 10) || 200;
                                                setResourceForm((prev) => ({
                                                    ...prev,
                                                    config: {
                                                        ...prev.config,
                                                        chunk_overlap,
                                                    },
                                                }));
                                            }}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </FieldGroup>
                </div>

                <Separator />

                {/* ── FOOTER ── */}
                <DialogFooter className="px-5 py-3 sm:px-6 sm:py-4 bg-muted/20 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                        <HugeiconsIcon icon={KeyboardIcon} className="size-3" strokeWidth={2} />
                        <span>Press <Kbd>⌘</Kbd> + <Kbd>Enter</Kbd> to submit</span>
                    </div>

                    <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="h-9 text-xs flex-1 sm:flex-initial"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={onSubmit}
                            disabled={!resourceForm.content.trim() || isSubmitting}
                            className="h-9 text-xs font-medium px-4 flex-1 sm:flex-initial"
                        >
                            {isSubmitting && <Spinner className="mr-2" />}
                            {actionButtonLabel}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
