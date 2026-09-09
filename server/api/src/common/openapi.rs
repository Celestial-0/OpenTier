//! OpenAPI surface.
//!
//! Seed coverage: health + problem envelope. Handler/path annotation
//! coverage expands incrementally; the spec is served live at
//! `/openapi.json` and browsable at `/swagger-ui`.

use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(title = "OpenTier Gateway API", version = "v1"),
    paths(crate::gateway::health::api_health_docs),
    components(schemas(crate::gateway::health::HealthResponse, ApiProblemDoc,))
)]
pub struct ApiDoc;

/// Serializable mirror of ApiProblem used for schema documentation.
#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct ApiProblemDoc {
    pub r#type: String,
    pub title: String,
    pub status: u16,
    pub code: String,
    pub detail: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}
