import {
    AdminStats,
    UserAdminView,
    ResourceItemResponse,
    ResourceConfig,
    HealthResponse,
    AddResourceRequest,
    Session
} from "@/lib/api-types";

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export type DashboardStats = AdminStats;

export type DashboardUser = UserAdminView;

export type DashboardResource = ResourceItemResponse;

export type DashboardResourceConfig = ResourceConfig;

export type DashboardHealth = HealthResponse;

export type DashboardAddResourceRequest = AddResourceRequest;

export type DashboardSession = Session;

export interface CreateResourceForm {
    resource_type: string;
    content: string;
    title: string;
    is_global: boolean;
    config: ResourceConfig;
}

export type UserRole = "user" | "admin";

export type ResourceType = string; // e.g., "url", "pdf", "markdown", etc.
export type ResourceStatus = string; // e.g., "completed", "processing", "failed"

export interface Notification {
    id: string;
    type: "system" | "conversation" | "security" | "admin";
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    notificationsEnabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
}
