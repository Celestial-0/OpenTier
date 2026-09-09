use serde::Serialize;
use uuid::Uuid;

/// Public chat model response for chat selector.
#[derive(Debug, Serialize)]
pub struct ChatModelResponse {
    pub id: Uuid,
    pub slug: String,
    pub display_name: String,
    pub provider_slug: String,
    pub provider_display_name: String,
    pub context_window: i32,
    pub max_output_tokens: Option<i32>,
    pub input_cost_per_mtok: f64,
    pub output_cost_per_mtok: f64,
    pub capabilities: serde_json::Value,
    pub is_default: bool,
    pub priority: i32,
}

/// Provider response.
#[derive(Debug, Serialize)]
pub struct ProviderResponse {
    pub id: Uuid,
    pub slug: String,
    pub display_name: String,
    pub base_url: String,
    pub enabled: bool,
    pub has_api_key: bool,
    #[serde(with = "crate::common::timestamp")]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(with = "crate::common::timestamp")]
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Full catalog model response.
#[derive(Debug, Serialize)]
pub struct CatalogModelResponse {
    pub id: Uuid,
    pub slug: String,
    pub display_name: String,
    pub provider_id: Uuid,
    pub provider_slug: String,
    pub provider_display_name: String,
    pub kind: String,
    pub context_window: i32,
    pub max_output_tokens: Option<i32>,
    pub dimensions: Option<i32>,
    pub input_cost_per_mtok: f64,
    pub output_cost_per_mtok: f64,
    pub capabilities: serde_json::Value,
    pub fallback_model_id: Option<Uuid>,
    pub fallback_slug: Option<String>,
    pub priority: i32,
    pub enabled: bool,
    pub is_default: bool,
    #[serde(with = "crate::common::timestamp")]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(with = "crate::common::timestamp")]
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, serde::Deserialize, Default)]
pub struct ReindexRequest {
    pub model_slug: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct ReindexResponse {
    pub reembedded_chunks: i32,
    pub dimensions: i32,
    pub model_slug: String,
    pub status: String,
}
