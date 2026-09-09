//! Catalog handlers for model providers and models.

use axum::{
    Json,
    extract::{Path, State},
};
use uuid::Uuid;

use super::errors::CatalogError;
use super::types::*;
use crate::gateway::AppState;
use crate::infra::postgres::catalog_repo;

// ── Helpers ──────────────────────────────────────────────────────────────────

fn row_to_chat_model(r: catalog_repo::ChatModelRow) -> ChatModelResponse {
    ChatModelResponse {
        id: r.id,
        slug: r.slug,
        display_name: r.display_name,
        provider_slug: r.provider_slug,
        provider_display_name: r.provider_display_name,
        context_window: r.context_window,
        max_output_tokens: r.max_output_tokens,
        input_cost_per_mtok: r.input_cost_per_mtok,
        output_cost_per_mtok: r.output_cost_per_mtok,
        capabilities: r.capabilities,
        is_default: r.is_default,
        priority: r.priority,
    }
}

fn row_to_provider(r: catalog_repo::ProviderRow) -> ProviderResponse {
    ProviderResponse {
        id: r.id,
        slug: r.slug,
        display_name: r.display_name,
        base_url: r.base_url,
        enabled: r.enabled,
        has_api_key: r.has_api_key,
        created_at: r.created_at,
        updated_at: r.updated_at,
    }
}

fn row_to_catalog_model(r: catalog_repo::AdminModelRow) -> CatalogModelResponse {
    CatalogModelResponse {
        id: r.id,
        slug: r.slug,
        display_name: r.display_name,
        provider_id: r.provider_id,
        provider_slug: r.provider_slug,
        provider_display_name: r.provider_display_name,
        kind: r.kind,
        context_window: r.context_window,
        max_output_tokens: r.max_output_tokens,
        dimensions: r.dimensions,
        input_cost_per_mtok: r.input_cost_per_mtok,
        output_cost_per_mtok: r.output_cost_per_mtok,
        capabilities: r.capabilities,
        fallback_model_id: r.fallback_model_id,
        fallback_slug: r.fallback_slug,
        priority: r.priority,
        enabled: r.enabled,
        is_default: r.is_default,
        created_at: r.created_at,
        updated_at: r.updated_at,
    }
}

/// Encrypt an API key using AES-256-GCM if ENCRYPTION_MASTER_KEY is set.
fn encrypt_api_key(key: &str) -> Result<Vec<u8>, CatalogError> {
    use aes_gcm::{Aes256Gcm, KeyInit, aead::Aead, aead::generic_array::GenericArray};
    use base64::Engine;

    let master_raw = std::env::var("ENCRYPTION_MASTER_KEY").map_err(|_| {
        CatalogError::BadRequest("ENCRYPTION_MASTER_KEY not configured".to_string())
    })?;
    let master_bytes = base64::engine::general_purpose::STANDARD
        .decode(master_raw.trim())
        .map_err(|_| CatalogError::BadRequest("Invalid ENCRYPTION_MASTER_KEY".to_string()))?;
    if master_bytes.len() != 32 {
        return Err(CatalogError::BadRequest(
            "ENCRYPTION_MASTER_KEY must be 32 bytes".to_string(),
        ));
    }

    let cipher = Aes256Gcm::new(GenericArray::from_slice(&master_bytes));
    let nonce_bytes: [u8; 12] = rand::random();
    let nonce = GenericArray::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, key.as_bytes())
        .map_err(|e| CatalogError::BadRequest(format!("Encryption failed: {e}")))?;

    let mut blob = Vec::with_capacity(12 + ciphertext.len());
    blob.extend_from_slice(&nonce_bytes);
    blob.extend(ciphertext);
    Ok(blob)
}

// ── Models Handlers ──────────────────────────────────────────────────────────

/// GET /v1/models — list enabled chat models.
pub async fn list_chat_models(
    State(state): State<AppState>,
) -> Result<Json<Vec<ChatModelResponse>>, CatalogError> {
    let rows = catalog_repo::list_chat_models(&state.db).await?;
    Ok(Json(rows.into_iter().map(row_to_chat_model).collect()))
}

/// GET /v1/models?all=true — list all catalog models.
pub async fn list_all_models(
    State(state): State<AppState>,
) -> Result<Json<Vec<CatalogModelResponse>>, CatalogError> {
    let rows = catalog_repo::list_all_models(&state.db).await?;
    Ok(Json(rows.into_iter().map(row_to_catalog_model).collect()))
}

/// POST /v1/models
pub async fn create_model(
    State(state): State<AppState>,
    Json(req): Json<catalog_repo::CreateModelReq>,
) -> Result<Json<CatalogModelResponse>, CatalogError> {
    let row = catalog_repo::create_model(&state.db, &req).await?;
    Ok(Json(row_to_catalog_model(row)))
}

/// PATCH /v1/models/{id}
pub async fn update_model(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<catalog_repo::UpdateModelReq>,
) -> Result<Json<CatalogModelResponse>, CatalogError> {
    let row = catalog_repo::update_model(&state.db, id, &req)
        .await?
        .ok_or(CatalogError::NotFound("Model"))?;
    Ok(Json(row_to_catalog_model(row)))
}

/// DELETE /v1/models/{id}
pub async fn delete_model(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, CatalogError> {
    let deleted = catalog_repo::delete_model(&state.db, id).await?;
    if !deleted {
        return Err(CatalogError::NotFound("Model"));
    }
    Ok(Json(serde_json::json!({"deleted": true})))
}

/// POST /v1/models/reindex — Re-embed all document chunks with the active embedding model
pub async fn reindex_all_documents(
    State(mut state): State<AppState>,
    Json(req): Json<ReindexRequest>,
) -> Result<Json<ReindexResponse>, CatalogError> {
    let resp = state
        .intelligence_client
        .reembed_all(req.model_slug)
        .await
        .map_err(|e| CatalogError::BadRequest(format!("Re-embedding failed: {e}")))?
        .into_inner();

    Ok(Json(ReindexResponse {
        reembedded_chunks: resp.reembedded_chunks,
        dimensions: resp.dimensions,
        model_slug: resp.model_slug,
        status: resp.status,
    }))
}

// ── Provider Handlers ────────────────────────────────────────────────────────

/// GET /v1/providers
pub async fn list_providers(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProviderResponse>>, CatalogError> {
    let rows = catalog_repo::list_providers(&state.db).await?;
    Ok(Json(rows.into_iter().map(row_to_provider).collect()))
}

/// POST /v1/providers
pub async fn create_provider(
    State(state): State<AppState>,
    Json(req): Json<catalog_repo::CreateProviderReq>,
) -> Result<Json<ProviderResponse>, CatalogError> {
    let encrypted = match &req.api_key {
        Some(key) if !key.is_empty() => Some(encrypt_api_key(key)?),
        _ => None,
    };
    let row = catalog_repo::create_provider(&state.db, &req, encrypted).await?;
    Ok(Json(row_to_provider(row)))
}

/// PATCH /v1/providers/{id}
pub async fn update_provider(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<catalog_repo::UpdateProviderReq>,
) -> Result<Json<ProviderResponse>, CatalogError> {
    let (encrypted, update_key) = match &req.api_key {
        Some(key) if !key.is_empty() => (Some(encrypt_api_key(key)?), true),
        _ => (None, false),
    };
    let row = catalog_repo::update_provider(&state.db, id, &req, encrypted, update_key)
        .await?
        .ok_or(CatalogError::NotFound("Provider"))?;
    Ok(Json(row_to_provider(row)))
}

/// DELETE /v1/providers/{id}
pub async fn delete_provider(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, CatalogError> {
    let count = catalog_repo::count_models_for_provider(&state.db, id).await?;
    if count > 0 {
        return Err(CatalogError::BadRequest(format!(
            "Cannot delete provider: {count} model(s) still reference it. Remove them first."
        )));
    }
    let deleted = catalog_repo::delete_provider(&state.db, id).await?;
    if !deleted {
        return Err(CatalogError::NotFound("Provider"));
    }
    Ok(Json(serde_json::json!({"deleted": true})))
}
