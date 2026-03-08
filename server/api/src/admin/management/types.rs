use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// ADMIN STATS
// ============================================================================

#[derive(Debug, Serialize)]
pub struct DataPoint {
    pub label: String,
    pub value: i32,
}

#[derive(Debug, Serialize)]
pub struct AdminStats {
    pub total_users: i32,
    pub active_users_24h: i32,
    pub total_conversations: i32,
    pub total_messages: i32,
    pub user_growth: Vec<DataPoint>,
    pub message_activity: Vec<DataPoint>,
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

#[derive(Debug, Serialize)]
pub struct UserAdminView {
    pub id: Uuid,
    pub email: String,
    pub full_name: Option<String>,
    pub role: String,
    pub is_verified: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_disabled: bool,
    pub message_limit: i32,
    pub messages_used: i32,
}

#[derive(Debug, Serialize)]
pub struct UserListResponse {
    pub users: Vec<UserAdminView>,
    pub total_count: i64,
    pub limit: i32,
    pub offset: i32,
}

#[derive(Debug, Deserialize)]
pub struct UserListQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRoleRequest {
    pub role: String, // "user", "admin", "moderator"
}

// ============================================================================
// QUOTA MANAGEMENT
// ============================================================================

/// Request body for setting a user's message limit
#[derive(Debug, Deserialize)]
pub struct SetMessageLimitRequest {
    /// New message limit (must be >= 0). Use 0 to effectively block AI access.
    pub message_limit: i32,
}

/// Request body for enabling/disabling a user account
#[derive(Debug, Deserialize)]
pub struct ToggleUserRequest {
    /// true = disable the user, false = re-enable them
    pub disabled: bool,
}

/// Response returned after modifying a user's quota / status
#[derive(Debug, Serialize)]
pub struct UserQuotaResponse {
    pub id: Uuid,
    pub email: String,
    pub is_disabled: bool,
    pub message_limit: i32,
    pub messages_used: i32,
}
