use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::errors::SubmissionError;

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_CONTENT_SIZE: usize = 10 * 1024 * 1024; // 10MB
const MAX_TITLE_LENGTH: usize = 500;
const VALID_RESOURCE_TYPES: &[&str] = &["text", "markdown", "html", "code", "url"];

// ============================================================================
// SUBMIT REQUEST / RESPONSE
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct SubmitResourceRequest {
    pub title: String,
    pub content: String,
    #[serde(default = "default_resource_type")]
    pub resource_type: String,
    pub metadata: Option<std::collections::HashMap<String, String>>,
}

fn default_resource_type() -> String {
    "text".to_string()
}

impl SubmitResourceRequest {
    pub fn validate(&self) -> Result<(), SubmissionError> {
        // Validate title
        if self.title.trim().is_empty() {
            return Err(SubmissionError::Validation(
                "Title must not be empty".to_string(),
            ));
        }
        if self.title.len() > MAX_TITLE_LENGTH {
            return Err(SubmissionError::Validation(format!(
                "Title must be less than {} characters",
                MAX_TITLE_LENGTH
            )));
        }

        // Validate content
        if self.content.trim().is_empty() {
            return Err(SubmissionError::Validation(
                "Content must not be empty".to_string(),
            ));
        }
        if self.content.len() > MAX_CONTENT_SIZE {
            return Err(SubmissionError::ContentTooLarge);
        }

        // Validate resource type
        if !VALID_RESOURCE_TYPES.contains(&self.resource_type.to_lowercase().as_str()) {
            return Err(SubmissionError::Validation(format!(
                "Invalid resource type '{}'. Must be one of: {}",
                self.resource_type,
                VALID_RESOURCE_TYPES.join(", ")
            )));
        }

        Ok(())
    }
}

#[derive(Debug, Serialize)]
pub struct SubmitResourceResponse {
    pub submission_id: Uuid,
    pub status: String,
    pub message: String,
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// QUEUE LIST
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct QueueListQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QueueListResponse {
    pub items: Vec<SubmissionItem>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct SubmissionItem {
    pub id: Uuid,
    pub contributor_id: Uuid,
    pub contributor_email: Option<String>,
    pub contributor_name: Option<String>,
    pub title: String,
    pub content: String,
    pub resource_type: String,
    pub metadata: serde_json::Value,
    pub status: String,
    pub admin_feedback: Option<String>,
    pub reviewed_by: Option<Uuid>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// REVIEW REQUEST / RESPONSE
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ReviewRequest {
    pub action: String, // "approve" or "reject"
    pub feedback: Option<String>,
}

impl ReviewRequest {
    pub fn validate(&self) -> Result<(), SubmissionError> {
        match self.action.to_lowercase().as_str() {
            "approve" | "reject" => Ok(()),
            other => Err(SubmissionError::InvalidAction(other.to_string())),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ReviewResponse {
    pub submission_id: Uuid,
    pub status: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub job_id: Option<String>,
}
