"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

import { useQuery } from "@/hooks/use-query";
import { getIntelligenceApiHealth, getRustApiHealth } from "@/lib/api/health-api";
import { adjustUserCreditsApi } from "@/lib/api/credits-api";
import {
    DashboardHealth,
    CreateResourceForm
} from "@/types/dashboard";
import { useAdmin } from "@/context/admin-context";
import { useAdminStore } from "@/store/admin-store";
import { Queue } from "./queue";
// import { AdminFooter } from "./admin/admin-footer";
import { AdminMonitoringTab } from "./admin/monitoring-tab";
import { AdminResourcesTab } from "./admin/resources-tab";
import { AdminStatsTab } from "./admin/stats-tab";
import { AdminUsersTab } from "./admin/users-tab";
import { AdminModelsTab } from "./admin/models-tab";

export const Admin = () => {
    // Admin context and store
    // Admin store data & UI state
    const {
        stats,
        users,
        resources,
        jobs,
        providers,
        catalogModels,
        isLoadingStats,
        isLoadingUsers,
        isLoadingResources,
        isLoadingProviders,
        isLoadingCatalogModels,
        isReembedding,
        activeTab,
        setActiveTab,
        fetchProviders,
        fetchCatalogModels,
        createProvider,
        updateProvider,
        deleteProvider,
        createCatalogModel,
        updateCatalogModel,
        deleteCatalogModel,
        reembedAll,
    } = useAdminStore();

    const {
        isAdmin,
        fetchStats,
        fetchUsers,
        fetchResources,
        updateUserRole,
        toggleUserDisabled,
        deleteUser,
        addResource,
        deleteResource
    } = useAdmin();

    // Health checks
    const RustApiHealth = useQuery<DashboardHealth>({
        queryKey: ["rust-api-health"],
        queryFn: getRustApiHealth,
    });
    const PythonApiHealth = useQuery<DashboardHealth>({
        queryKey: ["python-api-health"],
        queryFn: getIntelligenceApiHealth,
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
            fetchProviders();
            fetchCatalogModels();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]); // Only re-fetch when isAdmin changes

    const previousJobStatusesRef = useRef<Record<string, string>>({});

    useEffect(() => {
        const previousStatuses = previousJobStatusesRef.current;

        for (const job of jobs) {
            const previousStatus = previousStatuses[job.resource_id];
            const isTransitionFromActive = previousStatus === "queued" || previousStatus === "processing";

            if (isTransitionFromActive && job.status === "completed") {
                toast.success("Resource added successfully");
            }

            if (isTransitionFromActive && job.status === "failed") {
                toast.error(job.error || "Resource ingestion failed");
            }

            if (isTransitionFromActive && job.status === "partial") {
                toast.warning("Resource ingested partially. Some content could not be processed.");
            }
        }

        const nextStatuses: Record<string, string> = {};
        for (const job of jobs) {
            nextStatuses[job.resource_id] = job.status;
        }
        previousJobStatusesRef.current = nextStatuses;
    }, [jobs]);

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
                toast.success("User role updated");
            } catch (error) {
                console.error('Failed to update role:', error);
                toast.error("Failed to update user role");
            }
        }
    };

    // Handle toggle disable
    const handleToggleDisable = async (userId: string, currentStatus: boolean | undefined) => {
        try {
            await toggleUserDisabled(userId, !currentStatus);
            toast.success(`User ${!currentStatus ? 'disabled' : 'enabled'}`);
        } catch (error) {
            console.error('Failed to toggle status:', error);
            toast.error("Failed to toggle status");
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

    // Handle credit adjustment
    const handleAdjustCredits = async (
        userId: string,
        delta: number,
        reason: "admin_adjustment" | "grant" | "refund",
        note?: string
    ) => {
        try {
            const res = await adjustUserCreditsApi(userId, { delta, reason, note });
            toast.success(res.message || "Credits adjusted successfully");
            fetchUsers({ search: searchQuery });
        } catch (error) {
            console.error('Failed to adjust credits:', error);
            toast.error(error instanceof Error ? error.message : "Failed to adjust credits");
            throw error;
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
        <div className="flex flex-col gap-6">
            <div className="pb-3 border-b border-border/50">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {activeTab === "stats" && "Platform Telemetry"}
                    {activeTab === "users" && "User Directory"}
                    {activeTab === "resources" && "Knowledge Resources"}
                    {activeTab === "models" && "AI Models & Providers"}
                    {activeTab === "queue" && "Submissions Queue"}
                    {activeTab === "monitoring" && "System Health & Monitoring"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {activeTab === "models"
                        ? "Configure LLM providers, model specifications, embeddings, and routing."
                        : "Administrative configuration and platform controls."}
                </p>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">

                <AdminStatsTab stats={stats} isLoadingStats={isLoadingStats} />

                <AdminUsersTab
                    isLoadingUsers={isLoadingUsers}
                    users={users}
                    searchQuery={searchQuery}
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    onSearch={handleSearch}
                    onRoleUpdate={handleRoleUpdate}
                    onToggleDisable={handleToggleDisable}
                    onDeleteUser={handleDeleteUser}
                    onAdjustCredits={handleAdjustCredits}
                />

                <AdminResourcesTab
                    isLoadingResources={isLoadingResources}
                    resources={resources}
                    isAddResourceOpen={isAddResourceOpen}
                    setIsAddResourceOpen={setIsAddResourceOpen}
                    resourceForm={resourceForm}
                    setResourceForm={setResourceForm}
                    isSubmittingResource={isSubmittingResource}
                    onAddResource={handleAddResource}
                    onDeleteResource={handleDeleteResource}
                />

                <AdminMonitoringTab
                    rustApiHealth={RustApiHealth.data}
                    pythonApiHealth={PythonApiHealth.data}
                    isLoadingRustApi={RustApiHealth.isLoading}
                    isLoadingPythonApi={PythonApiHealth.isLoading}
                />


                <AdminModelsTab
                    providers={providers}
                    models={catalogModels}
                    isLoadingProviders={isLoadingProviders}
                    isLoadingModels={isLoadingCatalogModels}
                    onCreateProvider={createProvider}
                    onUpdateProvider={updateProvider}
                    onDeleteProvider={deleteProvider}
                    onCreateModel={createCatalogModel}
                    onUpdateModel={updateCatalogModel}
                    onDeleteModel={deleteCatalogModel}
                    isReembedding={isReembedding}
                    onReembedAll={reembedAll}
                />

                <TabsContent value="queue" className="space-y-4">
                    <Queue />
                </TabsContent>

                {/* <AdminFooter /> */}
            </Tabs>
        </div>
    );
};
