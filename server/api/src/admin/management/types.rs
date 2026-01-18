use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// ADMIN STATS
// ============================================================================

#[derive(Debug, Serialize)]
pub struct AdminStats {
    pub total_users: i32,
    pub active_users_24h: i32,
    pub total_conversations: i32,
    pub total_messages: i32,
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
