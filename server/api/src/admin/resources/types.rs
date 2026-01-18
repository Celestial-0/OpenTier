#![allow(dead_code)]
use serde::{Deserialize, Serialize};
use super::errors::ResourceError;

// Constants for validation
const MAX_CONTENT_SIZE: usize = 10 * 1024 * 1024; // 10MB
const MAX_TITLE_LENGTH: usize = 500;
const MIN_CONTENT_LENGTH: usize = 1;

// ============================================================================
// RESOURCE REQUEST/RESPONSE TYPES
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct AddResourceRequest {
    #[serde(rename = "type")]
    pub resource_type: String, // "url", "file", "text", "markdown", "pdf", "html", "code"
    pub content: String,
    pub title: Option<String>,
    pub metadata: Option<std::collections::HashMap<String, String>>,
    pub config: Option<ResourceConfig>,
}

impl AddResourceRequest {
    /// Validate the resource request
    pub fn validate(&self) -> Result<(), ResourceError> {
        // Validate resource type
        match self.resource_type.to_lowercase().as_str() {
            "url" | "text" | "markdown" | "pdf" | "html" | "code" | "file" => {}
            _ => return Err(ResourceError::UnsupportedResourceType(self.resource_type.clone())),
        }

        // Validate content length
        if self.content.is_empty() {
            return Err(ResourceError::InvalidContent);
        }

        if self.content.len() < MIN_CONTENT_LENGTH {
            return Err(ResourceError::Validation(
                "Content must not be empty".to_string(),
            ));
        }

        if self.content.len() > MAX_CONTENT_SIZE {
            return Err(ResourceError::ContentTooLarge);
        }

        // Validate URL format if type is URL
        if self.resource_type.to_lowercase() == "url" {
            self.validate_url()?;
        }

        // Validate title length if provided
        if let Some(ref title) = self.title {
            if title.len() > MAX_TITLE_LENGTH {
                return Err(ResourceError::Validation(format!(
                    "Title must be less than {} characters",
                    MAX_TITLE_LENGTH
                )));
            }
        }

        // Validate config if provided
        if let Some(ref config) = self.config {
            config.validate()?;
        }

        Ok(())
    }

    /// Validate URL format
    fn validate_url(&self) -> Result<(), ResourceError> {
        // Basic URL validation
        if !self.content.starts_with("http://") && !self.content.starts_with("https://") {
            return Err(ResourceError::InvalidUrl(
                "URL must start with http:// or https://".to_string(),
            ));
        }

        // Check if URL has at least a domain
        let url_part = if self.content.starts_with("https://") {
            &self.content[8..]
        } else {
            &self.content[7..]
        };

        if url_part.is_empty() || url_part.len() < 3 {
            return Err(ResourceError::InvalidUrl(
                "URL must have a valid domain".to_string(),
            ));
        }

        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct ResourceConfig {
    pub depth: Option<i32>,
    pub chunk_size: Option<i32>,
    pub chunk_overlap: Option<i32>,
    pub auto_clean: Option<bool>,
    pub generate_embeddings: Option<bool>,
    pub follow_links: Option<bool>,
}

impl ResourceConfig {
    /// Validate the resource config
    pub fn validate(&self) -> Result<(), ResourceError> {
        // Validate depth
        if let Some(depth) = self.depth {
            if depth < 0 || depth > 10 {
                return Err(ResourceError::Validation(
                    "Depth must be between 0 and 10".to_string(),
                ));
            }
        }

        // Validate chunk_size
        if let Some(size) = self.chunk_size {
            if size < 100 || size > 10000 {
                return Err(ResourceError::Validation(
                    "Chunk size must be between 100 and 10000".to_string(),
                ));
            }
        }

        // Validate chunk_overlap
        if let Some(overlap) = self.chunk_overlap {
            if overlap < 0 || overlap > 1000 {
                return Err(ResourceError::Validation(
                    "Chunk overlap must be between 0 and 1000".to_string(),
                ));
            }
        }

        Ok(())
    }
}

#[derive(Debug, Serialize)]
pub struct AddResourceResponse {
    pub resource_id: String,
    pub job_id: String,
    pub status: String,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct ListResourcesQuery {
    pub limit: Option<i32>,
    pub cursor: Option<String>,
    pub resource_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetResourceStatusQuery {
    pub job_id: Option<String>,
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ResourceItem {
    pub id: String,
    #[serde(rename = "type")]
    pub resource_type: String,
    pub content: String,
    pub status: String,
    pub stats: Option<ResourceStats>,
    pub created_at: i64,
}

#[derive(Debug, Serialize)]
pub struct ResourceItemResponse {
    pub id: String,
    #[serde(rename = "type")]
    pub resource_type: String,
    pub content: String,
    pub status: String,
    pub chunks_created: i32,
    pub documents: i32,
    pub metadata: std::collections::HashMap<String, String>,
    pub created_at: i64,
}

#[derive(Debug, Serialize)]
pub struct ResourceStats {
    pub documents: i32,
    pub chunks: i32,
}

#[derive(Debug, Serialize)]
pub struct ListResourcesResponse {
    pub items: Vec<ResourceItemResponse>,
    pub next_cursor: Option<String>,
    pub total: i32,
}

#[derive(Debug, Serialize)]
pub struct ResourceResponse {
    pub id: uuid::Uuid,
    pub user_id: String,
    pub resource_type: String,
    pub content: String,
    pub status: String,
    pub job_id: Option<String>,
    pub error: Option<String>,
    pub documents_count: i32,
    pub chunks_count: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
pub struct ResourceListResponse {
    pub resources: Vec<ResourceResponse>,
    pub total_count: i32,
}

#[derive(Debug, Serialize)]
pub struct ResourceStatusResponse {
    pub job_id: String,
    pub resource_id: String,
    pub status: String,
    pub chunks_created: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub progress: f32,
}

#[derive(Debug, Serialize)]
pub struct ResourceProgress {
    pub stage: String, // "scraping", "cleaning", "embedding", "indexing"
    pub percent: i32,
}
