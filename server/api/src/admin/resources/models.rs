#![allow(dead_code)]
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Resource status enum
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "resource_status", rename_all = "lowercase")]
pub enum ResourceStatus {
    Queued,
    Processing,
    Completed,
    Failed,
}

impl From<String> for ResourceStatus {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "queued" => ResourceStatus::Queued,
            "processing" => ResourceStatus::Processing,
            "completed" => ResourceStatus::Completed,
            "failed" => ResourceStatus::Failed,
            _ => ResourceStatus::Queued,
        }
    }
}

/// Resource type enum
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "resource_type", rename_all = "lowercase")]
pub enum ResourceType {
    Url,
    File,
    Text,
}

impl From<String> for ResourceType {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "url" => ResourceType::Url,
            "file" => ResourceType::File,
            "text" => ResourceType::Text,
            _ => ResourceType::Url,
        }
    }
}

/// Resource domain model - represents an ingested resource
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Resource {
    pub id: Uuid,
    pub user_id: Uuid,

    #[sqlx(try_from = "String")]
    pub resource_type: ResourceType,

    pub content: String,
    pub metadata: Option<serde_json::Value>,

    #[sqlx(try_from = "String")]
    pub status: ResourceStatus,

    pub job_id: Option<String>,
    pub error: Option<String>,

    // Stats
    pub documents_count: i32,
    pub chunks_count: i32,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Resource {
    /// Create a new resource
    pub fn new(user_id: Uuid, resource_type: ResourceType, content: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            user_id,
            resource_type,
            content,
            metadata: None,
            status: ResourceStatus::Queued,
            job_id: None,
            error: None,
            documents_count: 0,
            chunks_count: 0,
            created_at: now,
            updated_at: now,
        }
    }

    /// Mark resource as processing
    pub fn mark_processing(&mut self, job_id: String) {
        self.status = ResourceStatus::Processing;
        self.job_id = Some(job_id);
        self.updated_at = Utc::now();
    }

    /// Mark resource as completed
    pub fn mark_completed(&mut self, documents: i32, chunks: i32) {
        self.status = ResourceStatus::Completed;
        self.documents_count = documents;
        self.chunks_count = chunks;
        self.updated_at = Utc::now();
    }

    /// Mark resource as failed
    pub fn mark_failed(&mut self, error: String) {
        self.status = ResourceStatus::Failed;
        self.error = Some(error);
        self.updated_at = Utc::now();
    }

    /// Check if resource is completed
    pub fn is_completed(&self) -> bool {
        matches!(self.status, ResourceStatus::Completed)
    }
}
