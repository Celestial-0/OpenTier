use crate::auth::Role;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// SELF-SERVICE USER TYPES
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub email_verified: bool,
    pub has_password: bool,
    pub name: Option<String>,
    pub username: Option<String>,
    pub avatar_url: Option<String>,
    pub role: Role,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub username: Option<String>,
    pub avatar_url: Option<String>,
    pub contributor_opt_in: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: Option<String>,
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct ChangePasswordResponse {
    pub message: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct Account {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider: String,
    pub provider_account_id: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub expires_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub device_name: Option<String>,
    pub device_type: Option<String>,
    pub is_current: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SessionListResponse {
    pub sessions: Vec<Session>,
}

#[derive(Debug, Serialize)]
pub struct DeleteAccountResponse {
    pub message: String,
}

// ============================================================================
// CREDITS & TRANSACTIONS TYPES
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct TransactionsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UserTransactionsResponse {
    pub transactions: Vec<crate::infra::postgres::billing_repo::CreditTransactionItem>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

// ============================================================================
// ADMINISTRATIVE USER MANAGEMENT TYPES
// ============================================================================

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserAdminView {
    pub id: Uuid,
    pub email: String,
    pub full_name: Option<String>,
    pub role: String,
    pub is_verified: bool,
    #[serde(with = "crate::common::timestamp")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "crate::common::timestamp")]
    pub updated_at: DateTime<Utc>,
    pub is_disabled: bool,
    pub message_limit: i32,
    pub messages_used: i32,
    pub credit_balance: f64,
    pub credit_held: f64,
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
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct ToggleUserRequest {
    pub disabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct AdminUpdateUserRequest {
    pub is_disabled: Option<bool>,
    pub disabled: Option<bool>,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AdjustCreditsRequest {
    pub delta: f64,
    pub reason: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdjustCreditsResponse {
    pub user_id: Uuid,
    pub delta: f64,
    pub new_balance: f64,
    pub transaction_id: Uuid,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct AdminUserCreditsResponse {
    pub user_id: Uuid,
    pub summary: crate::infra::postgres::billing_repo::UserCreditSummary,
    pub recent_transactions: Vec<crate::infra::postgres::billing_repo::CreditTransactionItem>,
}
