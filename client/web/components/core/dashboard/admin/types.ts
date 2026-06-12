import type { Dispatch, SetStateAction } from "react";
import type { AdminStats, DashboardHealth, ResourceItemResponse, UserAdminView } from "@/lib/api-types";
import type { CreateResourceForm } from "@/types/dashboard";

export type UserSelectState = Record<string, string>;

export interface AdminStatsTabProps {
    stats: AdminStats | null;
    isLoadingStats: boolean;
}

export interface AdminUsersTabProps {
    isLoadingUsers: boolean;
    users: UserAdminView[];
    searchQuery: string;
    selectedRole: UserSelectState;
    selectedLimit: UserSelectState;
    setSelectedRole: Dispatch<SetStateAction<UserSelectState>>;
    setSelectedLimit: Dispatch<SetStateAction<UserSelectState>>;
    onSearch: (query: string) => void;
    onRoleUpdate: (userId: string) => Promise<void>;
    onLimitUpdate: (userId: string) => Promise<void>;
    onToggleDisable: (userId: string, currentStatus: boolean | undefined) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
}

export interface AdminResourcesTabProps {
    isLoadingResources: boolean;
    resources: ResourceItemResponse[];
    isAddResourceOpen: boolean;
    setIsAddResourceOpen: Dispatch<SetStateAction<boolean>>;
    resourceForm: CreateResourceForm;
    setResourceForm: Dispatch<SetStateAction<CreateResourceForm>>;
    isSubmittingResource: boolean;
    onAddResource: () => Promise<void>;
    onDeleteResource: (resourceId: string) => Promise<void>;
}

export interface AdminMonitoringTabProps {
    rustApiHealth: DashboardHealth | null;
    pythonApiHealth: DashboardHealth | null;
}
