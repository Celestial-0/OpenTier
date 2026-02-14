use axum::{
    extract::{Extension, Path, Query, State},
    http::{header, HeaderMap},
    body::Bytes,
    Json,
};
use uuid::Uuid;

use super::types::*;
use super::errors::ResourceError;
use crate::gateway::AppState;
use crate::grpc::proto::opentier::intelligence::v1 as pb;

// ============================================================================
// HANDLERS
// ============================================================================

/// Add a new resource for ingestion
/// POST /admin/resources
pub async fn add_resource(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<AddResourceResponse>, ResourceError> {
    // Check Content-Type header
    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    if !content_type.starts_with("application/json") {
        return Err(ResourceError::InvalidContentType(format!(
            "Expected 'application/json', got '{}'",
            content_type
        )));
    }

    // Parse body
    let req: AddResourceRequest = serde_json::from_slice(&body)
        .map_err(|e| ResourceError::Validation(format!("Invalid JSON: {}", e)))?;

    // Validate request
    req.validate()?;

    let mut client = state.intelligence_client.clone();

    // Generate IDs
    let resource_id = Uuid::new_v4().to_string();

    // Map to appropriate gRPC call based on type
    let content = match req.resource_type.to_lowercase().as_str() {
        "url" => Some(pb::add_resource_request::Content::Url(req.content.clone())),
        "text" | "markdown" | "html" | "code" => {
            Some(pb::add_resource_request::Content::Text(req.content.clone()))
        }
        "file" => Some(pb::add_resource_request::Content::FileContent(
            req.content.as_bytes().to_vec(),
        )),
        _ => return Err(ResourceError::UnsupportedResourceType(req.resource_type.clone())),
    };

    let resource_type = match req.resource_type.to_lowercase().as_str() {
        "url" => pb::ResourceType::Website,
        "text" => pb::ResourceType::Text,
        "markdown" => pb::ResourceType::Markdown,
        "pdf" => pb::ResourceType::Pdf,
        "html" => pb::ResourceType::Html,
        "code" => pb::ResourceType::Code,
        "file" => pb::ResourceType::Code,
        _ => pb::ResourceType::Unspecified,
    };

    let mut metadata = req.metadata.clone().unwrap_or_default();
    
    // Ensure title is preserved in metadata
    if let Some(ref t) = req.title {
        metadata.insert("title".to_string(), t.clone());
    } else {
        // fallback to generated title
        let generated: String = req.content.chars().take(50).collect();
        metadata.insert("title".to_string(), generated);
    }
    
    // Preserve original requested type
    metadata.insert("original_type".to_string(), req.resource_type.clone());

    let grpc_req = pb::AddResourceRequest {
        user_id: user_id.to_string(),
        resource_id: resource_id.clone(),
        content,
        r#type: resource_type as i32,
        title: req.title.clone(),
        metadata,
        config: req.config.as_ref().map(|cfg| pb::IngestionConfig {
            chunk_size: cfg.chunk_size.or(Some(1000)),
            chunk_overlap: cfg.chunk_overlap.or(Some(200)),
            auto_clean: cfg.auto_clean.or(Some(true)),
            generate_embeddings: cfg.generate_embeddings.or(Some(true)),
            max_depth: cfg.depth.or(Some(1)),
            follow_links: cfg.follow_links.or(Some(false)),
        }),
        is_global: req.is_global.unwrap_or(false),
    };

    let response = client
        .add_resource(grpc_req)
        .await
        .map_err(|e| ResourceError::GrpcError(e.to_string()))?
        .into_inner();

    let status = pb::ResourceStatus::try_from(response.status)
        .ok()
        .and_then(|s| match s {
            pb::ResourceStatus::Unspecified => Some("unspecified".to_string()),
            pb::ResourceStatus::Queued => Some("queued".to_string()),
            pb::ResourceStatus::Processing => Some("processing".to_string()),
            pb::ResourceStatus::Completed => Some("completed".to_string()),
            pb::ResourceStatus::Failed => Some("failed".to_string()),
            pb::ResourceStatus::Partial => Some("partial".to_string()),
        })
        .unwrap_or_else(|| "queued".to_string());

    Ok(Json(AddResourceResponse {
        resource_id: response.resource_id,
        job_id: response.job_id,
        status,
        created_at: chrono::Utc::now().timestamp(),
    }))
}

/// List all resources
/// GET /admin/resources
pub async fn list_resources(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Query(params): Query<ListResourcesQuery>,
) -> Result<Json<ListResourcesResponse>, ResourceError> {
    let mut client = state.intelligence_client.clone();

    let type_filter = params.resource_type.as_ref().map(|t| {
        match t.to_lowercase().as_str() {
            "text" => pb::ResourceType::Text as i32,
            "markdown" => pb::ResourceType::Markdown as i32,
            "pdf" => pb::ResourceType::Pdf as i32,
            "html" => pb::ResourceType::Html as i32,
            "website" => pb::ResourceType::Website as i32,
            "code" => pb::ResourceType::Code as i32,
            _ => pb::ResourceType::Unspecified as i32,
        }
    });

    let status_filter = params.status.as_ref().map(|s| {
        match s.to_lowercase().as_str() {
            "queued" => pb::ResourceStatus::Queued as i32,
            "processing" => pb::ResourceStatus::Processing as i32,
            "completed" => pb::ResourceStatus::Completed as i32,
            "failed" => pb::ResourceStatus::Failed as i32,
            "partial" => pb::ResourceStatus::Partial as i32,
            _ => pb::ResourceStatus::Unspecified as i32,
        }
    });

    // Validate limit
    let limit = params.limit.unwrap_or(20);
    if limit < 1 || limit > 100 {
        return Err(ResourceError::InvalidFilters);
    }

    let grpc_req = pb::ListResourcesRequest {
        user_id: user_id.to_string(),
        limit: Some(limit),
        cursor: params.cursor.clone(),
        type_filter: type_filter,
        status_filter: status_filter,
    };

    let response = client
        .list_resources(grpc_req)
        .await
        .map_err(|e| ResourceError::GrpcError(e.to_string()))?
        .into_inner();

    let items = response
        .items
        .into_iter()
        .map(|item| {
            let item_type = pb::ResourceType::try_from(item.r#type)
                .ok()
                .map(|t| match t {
                    pb::ResourceType::Text => "text",
                    pb::ResourceType::Markdown => "markdown",
                    pb::ResourceType::Pdf => "pdf",
                    pb::ResourceType::Html => "html",
                    pb::ResourceType::Website => "website",
                    pb::ResourceType::Code => "code",
                    _ => "unspecified",
                })
                .unwrap_or("unspecified")
                .to_string();

            let item_status = pb::ResourceStatus::try_from(item.status)
                .ok()
                .map(|s| match s {
                    pb::ResourceStatus::Queued => "queued",
                    pb::ResourceStatus::Processing => "processing",
                    pb::ResourceStatus::Completed => "completed",
                    pb::ResourceStatus::Failed => "failed",
                    pb::ResourceStatus::Partial => "partial",
                    _ => "unspecified",
                })
                .unwrap_or("unspecified")
                .to_string();

            let title = item.metadata.get("title").cloned();
            
            // Prefer original type from metadata if available, otherwise use mapped type
            let final_type = if let Some(orig) = item.metadata.get("original_type") {
                orig.clone()
            } else {
                item_type
            };

            ResourceItemResponse {
                id: item.id,
                resource_type: final_type,
                content: item.content,
                status: item_status,
                chunks_created: item.stats.as_ref().map(|s| s.chunks).unwrap_or(0),
                documents: item.stats.as_ref().map(|s| s.documents).unwrap_or(0),
                metadata: item.metadata,
                created_at: item.created_at,
                title,
                is_global: item.is_global,
            }
        })
        .collect();

    Ok(Json(ListResourcesResponse {
        items,
        next_cursor: response.next_cursor,
        total: response.total_count,
    }))
}

/// Get resource status
/// GET /admin/resources/{id}
pub async fn get_resource_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(params): Query<GetResourceStatusQuery>,
) -> Result<Json<ResourceStatusResponse>, ResourceError> {
    let mut client = state.intelligence_client.clone();

    let grpc_req = pb::GetResourceStatusRequest {
        job_id: params.job_id.unwrap_or_default(),
        resource_id: id.to_string(),
        user_id: params.user_id.unwrap_or_default(),
    };

    let response = client
        .get_resource_status(grpc_req)
        .await
        .map_err(|e| ResourceError::GrpcError(e.to_string()))?
        .into_inner();

    let status = pb::ResourceStatus::try_from(response.status)
        .ok()
        .map(|s| match s {
            pb::ResourceStatus::Unspecified => "unspecified",
            pb::ResourceStatus::Queued => "queued",
            pb::ResourceStatus::Processing => "processing",
            pb::ResourceStatus::Completed => "completed",
            pb::ResourceStatus::Failed => "failed",
            pb::ResourceStatus::Partial => "partial",
        })
        .unwrap_or("unspecified")
        .to_string();

    Ok(Json(ResourceStatusResponse {
        job_id: response.job_id,
        resource_id: response.resource_id,
        status,
        chunks_created: response.chunks_created,
        error: response.error,
        progress: response.progress,
    }))
}

/// Delete resource and all associated data
/// DELETE /admin/resources/{id}
pub async fn delete_resource(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, ResourceError> {
    let mut client = state.intelligence_client.clone();

    let response = client
        .delete_resource(pb::DeleteResourceRequest {
            user_id: user_id.to_string(),
            resource_id: id.to_string(),
        })
        .await
        .map_err(|e| ResourceError::GrpcError(e.to_string()))?
        .into_inner();

    if response.success {
        Ok(Json(serde_json::json!({
            "success": true,
            "message": "Resource deleted successfully",
            "resource_id": response.resource_id
        })))
    } else {
        Err(ResourceError::DeleteResourceFailed)
    }
}
