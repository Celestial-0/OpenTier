// ============================================================================
// DASHBOARD VIEW TYPES - Centralized aliases for UI concerns
// ============================================================================

import type {
    AdminStats,
    UserAdminView,
} from "./admin";
import type {
    HealthResponse,
} from "./health";
import type {
    Session,
} from "./session";
import type {
    ResourceItemResponse,
    ResourceConfig,
    AddResourceRequest,
} from "./resources";

// Dashboard-specific type aliases for view layer
export type DashboardStats = AdminStats;
export type DashboardUser = UserAdminView;
export type DashboardHealth = HealthResponse;
export type DashboardSession = Session;
export type DashboardResource = ResourceItemResponse;
export type DashboardResourceConfig = ResourceConfig;
export type DashboardAddResourceRequest = AddResourceRequest;

export type DashboardView =
    | "overview"
    | "conversations"
    | "sessions"
    | "notifications"
    | "profile"
    | "settings"
    | "admin"
    | "contributor";

export interface CreateResourceForm {
    resource_type: string;
    content: string;
    title: string;
    is_global: boolean;
    config: ResourceConfig;
}

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
