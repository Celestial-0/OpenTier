//! Catalog repository — SQL for model_providers / models tables.

use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ── Row types ────────────────────────────────────────────────────────────────

/// Public-facing chat model (join of models + model_providers).
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ChatModelRow {
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

/// Full model row for admin (includes disabled, embedding, fallback info).
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AdminModelRow {
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
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Provider row for admin.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ProviderRow {
    pub id: Uuid,
    pub slug: String,
    pub display_name: String,
    pub base_url: String,
    pub enabled: bool,
    pub has_api_key: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

// ── Request types ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateProviderReq {
    pub slug: String,
    pub display_name: String,
    pub base_url: String,
    pub api_key: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProviderReq {
    pub display_name: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModelReq {
    pub provider_id: Uuid,
    pub slug: String,
    pub display_name: String,
    pub kind: String,
    pub context_window: Option<i32>,
    pub max_output_tokens: Option<i32>,
    pub dimensions: Option<i32>,
    pub input_cost_per_mtok: Option<f64>,
    pub output_cost_per_mtok: Option<f64>,
    pub capabilities: Option<serde_json::Value>,
    pub fallback_model_id: Option<Uuid>,
    pub priority: Option<i32>,
    pub enabled: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModelReq {
    pub display_name: Option<String>,
    pub context_window: Option<i32>,
    pub max_output_tokens: Option<i32>,
    pub dimensions: Option<i32>,
    pub input_cost_per_mtok: Option<f64>,
    pub output_cost_per_mtok: Option<f64>,
    pub capabilities: Option<serde_json::Value>,
    pub fallback_model_id: Option<Option<Uuid>>,
    pub priority: Option<i32>,
    pub enabled: Option<bool>,
    pub is_default: Option<bool>,
}

// ── Queries ──────────────────────────────────────────────────────────────────

/// List enabled chat models (public).
pub async fn list_chat_models(pool: &PgPool) -> Result<Vec<ChatModelRow>, sqlx::Error> {
    sqlx::query_as::<_, ChatModelRow>(
        r#"
        SELECT
            m.id,
            m.slug,
            m.display_name,
            p.slug AS provider_slug,
            p.display_name AS provider_display_name,
            m.context_window,
            m.max_output_tokens,
            m.input_cost_per_mtok::float8 AS input_cost_per_mtok,
            m.output_cost_per_mtok::float8 AS output_cost_per_mtok,
            m.capabilities,
            m.is_default,
            m.priority
        FROM models m
        JOIN model_providers p ON p.id = m.provider_id
        WHERE m.enabled
          AND p.enabled
          AND m.kind = 'chat'
        ORDER BY m.priority ASC, m.display_name ASC
        "#,
    )
    .fetch_all(pool)
    .await
}

/// List all models (admin, includes disabled & embedding).
pub async fn list_all_models(pool: &PgPool) -> Result<Vec<AdminModelRow>, sqlx::Error> {
    sqlx::query_as::<_, AdminModelRow>(
        r#"
        SELECT
            m.id,
            m.slug,
            m.display_name,
            m.provider_id,
            p.slug AS provider_slug,
            p.display_name AS provider_display_name,
            m.kind::text AS kind,
            m.context_window,
            m.max_output_tokens,
            m.dimensions,
            m.input_cost_per_mtok::float8 AS input_cost_per_mtok,
            m.output_cost_per_mtok::float8 AS output_cost_per_mtok,
            m.capabilities,
            m.fallback_model_id,
            f.slug AS fallback_slug,
            m.priority,
            m.enabled,
            m.is_default,
            m.created_at,
            m.updated_at
        FROM models m
        JOIN model_providers p ON p.id = m.provider_id
        LEFT JOIN models f ON f.id = m.fallback_model_id
        ORDER BY m.kind, m.priority ASC, m.display_name ASC
        "#,
    )
    .fetch_all(pool)
    .await
}

/// List all providers (admin).
pub async fn list_providers(pool: &PgPool) -> Result<Vec<ProviderRow>, sqlx::Error> {
    sqlx::query_as::<_, ProviderRow>(
        r#"
        SELECT
            id,
            slug,
            display_name,
            base_url,
            enabled,
            (encrypted_api_key IS NOT NULL) AS has_api_key,
            created_at,
            updated_at
        FROM model_providers
        ORDER BY display_name ASC
        "#,
    )
    .fetch_all(pool)
    .await
}

/// Create a new provider.
pub async fn create_provider(
    pool: &PgPool,
    req: &CreateProviderReq,
    encrypted_key: Option<Vec<u8>>,
) -> Result<ProviderRow, sqlx::Error> {
    sqlx::query_as::<_, ProviderRow>(
        r#"
        INSERT INTO model_providers (slug, display_name, base_url, encrypted_api_key, enabled)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, slug, display_name, base_url, enabled,
                  (encrypted_api_key IS NOT NULL) AS has_api_key,
                  created_at, updated_at
        "#,
    )
    .bind(&req.slug)
    .bind(&req.display_name)
    .bind(&req.base_url)
    .bind(encrypted_key.as_deref())
    .bind(req.enabled.unwrap_or(true))
    .fetch_one(pool)
    .await
}

/// Update a provider.
pub async fn update_provider(
    pool: &PgPool,
    id: Uuid,
    req: &UpdateProviderReq,
    encrypted_key: Option<Vec<u8>>,
    update_key: bool,
) -> Result<Option<ProviderRow>, sqlx::Error> {
    let row = sqlx::query_as::<_, ProviderRow>(
        r#"
        UPDATE model_providers
        SET
            display_name = COALESCE($2, display_name),
            base_url     = COALESCE($3, base_url),
            encrypted_api_key = CASE WHEN $5 THEN $4 ELSE encrypted_api_key END,
            enabled      = COALESCE($6, enabled)
        WHERE id = $1
        RETURNING id, slug, display_name, base_url, enabled,
                  (encrypted_api_key IS NOT NULL) AS has_api_key,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.display_name.as_deref())
    .bind(req.base_url.as_deref())
    .bind(encrypted_key.as_deref())
    .bind(update_key)
    .bind(req.enabled)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Delete a provider (only if no models reference it).
pub async fn delete_provider(pool: &PgPool, id: Uuid) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM model_providers WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

/// Create a new model.
pub async fn create_model(
    pool: &PgPool,
    req: &CreateModelReq,
) -> Result<AdminModelRow, sqlx::Error> {
    // If is_default, first unset any existing default for same kind
    if req.is_default.unwrap_or(false) {
        sqlx::query(
            "UPDATE models SET is_default = FALSE WHERE kind = $1::model_kind AND is_default",
        )
        .bind(&req.kind)
        .execute(pool)
        .await?;
    }

    sqlx::query_as::<_, AdminModelRow>(
        r#"
        WITH inserted AS (
            INSERT INTO models (
                provider_id, slug, display_name, kind,
                context_window, max_output_tokens, dimensions,
                input_cost_per_mtok, output_cost_per_mtok,
                capabilities, fallback_model_id,
                priority, enabled, is_default
            ) VALUES (
                $1, $2, $3, $4::model_kind,
                $5, $6, $7,
                $8, $9,
                $10, $11,
                $12, $13, $14
            )
            RETURNING *
        )
        SELECT
            i.id, i.slug, i.display_name, i.provider_id,
            p.slug AS provider_slug, p.display_name AS provider_display_name,
            i.kind::text AS kind, i.context_window, i.max_output_tokens,
            i.dimensions,
            i.input_cost_per_mtok::float8 AS input_cost_per_mtok,
            i.output_cost_per_mtok::float8 AS output_cost_per_mtok,
            i.capabilities, i.fallback_model_id,
            f.slug AS fallback_slug,
            i.priority, i.enabled, i.is_default,
            i.created_at, i.updated_at
        FROM inserted i
        JOIN model_providers p ON p.id = i.provider_id
        LEFT JOIN models f ON f.id = i.fallback_model_id
        "#,
    )
    .bind(req.provider_id)
    .bind(&req.slug)
    .bind(&req.display_name)
    .bind(&req.kind)
    .bind(req.context_window.unwrap_or(8192))
    .bind(req.max_output_tokens)
    .bind(req.dimensions)
    .bind(req.input_cost_per_mtok.unwrap_or(0.0))
    .bind(req.output_cost_per_mtok.unwrap_or(0.0))
    .bind(req.capabilities.clone().unwrap_or(serde_json::json!({})))
    .bind(req.fallback_model_id)
    .bind(req.priority.unwrap_or(100))
    .bind(req.enabled.unwrap_or(true))
    .bind(req.is_default.unwrap_or(false))
    .fetch_one(pool)
    .await
}

/// Update a model.
pub async fn update_model(
    pool: &PgPool,
    id: Uuid,
    req: &UpdateModelReq,
) -> Result<Option<AdminModelRow>, sqlx::Error> {
    // If setting as default, unset other defaults of same kind first
    if req.is_default == Some(true) {
        let kind_row: Option<(String,)> =
            sqlx::query_as("SELECT kind::text FROM models WHERE id = $1")
                .bind(id)
                .fetch_optional(pool)
                .await?;
        if let Some((kind,)) = kind_row {
            sqlx::query(
                "UPDATE models SET is_default = FALSE WHERE kind = $1::model_kind AND is_default AND id != $2",
            )
            .bind(&kind)
            .bind(id)
            .execute(pool)
            .await?;
        }
    }

    let row = sqlx::query_as::<_, AdminModelRow>(
        r#"
        WITH updated AS (
            UPDATE models
            SET
                display_name       = COALESCE($2, display_name),
                context_window     = COALESCE($3, context_window),
                max_output_tokens  = COALESCE($4, max_output_tokens),
                dimensions         = COALESCE($5, dimensions),
                input_cost_per_mtok  = COALESCE($6, input_cost_per_mtok),
                output_cost_per_mtok = COALESCE($7, output_cost_per_mtok),
                capabilities       = COALESCE($8, capabilities),
                fallback_model_id  = CASE WHEN $9 THEN $10 ELSE fallback_model_id END,
                priority           = COALESCE($11, priority),
                enabled            = COALESCE($12, enabled),
                is_default         = COALESCE($13, is_default)
            WHERE id = $1
            RETURNING *
        )
        SELECT
            u.id, u.slug, u.display_name, u.provider_id,
            p.slug AS provider_slug, p.display_name AS provider_display_name,
            u.kind::text AS kind, u.context_window, u.max_output_tokens,
            u.dimensions,
            u.input_cost_per_mtok::float8 AS input_cost_per_mtok,
            u.output_cost_per_mtok::float8 AS output_cost_per_mtok,
            u.capabilities, u.fallback_model_id,
            f.slug AS fallback_slug,
            u.priority, u.enabled, u.is_default,
            u.created_at, u.updated_at
        FROM updated u
        JOIN model_providers p ON p.id = u.provider_id
        LEFT JOIN models f ON f.id = u.fallback_model_id
        "#,
    )
    .bind(id)
    .bind(req.display_name.as_deref())
    .bind(req.context_window)
    .bind(req.max_output_tokens)
    .bind(req.dimensions)
    .bind(req.input_cost_per_mtok)
    .bind(req.output_cost_per_mtok)
    .bind(req.capabilities.clone())
    .bind(req.fallback_model_id.is_some()) // $9: whether to update fallback
    .bind(req.fallback_model_id.flatten()) // $10: the new fallback (or NULL)
    .bind(req.priority)
    .bind(req.enabled)
    .bind(req.is_default)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Delete a model.
pub async fn delete_model(pool: &PgPool, id: Uuid) -> Result<bool, sqlx::Error> {
    // First clear any fallback references to this model
    sqlx::query("UPDATE models SET fallback_model_id = NULL WHERE fallback_model_id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    let result = sqlx::query("DELETE FROM models WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

/// Count models referencing a provider (for safe deletion check).
pub async fn count_models_for_provider(
    pool: &PgPool,
    provider_id: Uuid,
) -> Result<i64, sqlx::Error> {
    let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM models WHERE provider_id = $1")
        .bind(provider_id)
        .fetch_one(pool)
        .await?;
    Ok(count)
}
