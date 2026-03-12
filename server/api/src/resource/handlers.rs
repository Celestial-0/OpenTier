use axum::{
    Json,
    extract::{Extension, Path, Query, State},
};
use uuid::Uuid;

use super::errors::SubmissionError;
use super::types::*;
use crate::gateway::AppState;
use crate::grpc::proto::opentier::intelligence::v1 as pb;

// ============================================================================
// POST /resources/submissions
// ============================================================================

/// Submit a resource for review
/// Accessible by Contributors and Admins
pub async fn submit_resource(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<SubmitResourceRequest>,
) -> Result<Json<SubmitResourceResponse>, SubmissionError> {
    // Validate request
    req.validate()?;

    let metadata_json = match &req.metadata {
        Some(m) => serde_json::to_value(m).unwrap_or_default(),
        None => serde_json::json!({}),
    };

    // Insert into knowledge_submissions as pending
    let row = sqlx::query!(
        r#"
        INSERT INTO knowledge_submissions (contributor_id, title, content, resource_type, metadata, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id, created_at
        "#,
        user_id,
        req.title,
        req.content,
        req.resource_type.to_lowercase(),
        metadata_json,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(SubmitResourceResponse {
        submission_id: row.id,
        status: "pending".to_string(),
        message: "Resource submitted for review".to_string(),
        created_at: row.created_at,
    }))
}

// ============================================================================
// GET /resources/submissions/mine
// ============================================================================

/// List submissions created by the authenticated user
/// Accessible by Contributors and Admins
pub async fn list_my_submissions(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Query(params): Query<QueueListQuery>,
) -> Result<Json<QueueListResponse>, SubmissionError> {
    let limit = params.limit.unwrap_or(20).min(100).max(1);
    let offset = params.offset.unwrap_or(0).max(0);
    let status_filter = params.status;

    let rows = sqlx::query!(
        r#"
        SELECT
            ks.id,
            ks.contributor_id,
            u.email as contributor_email,
            u.name as contributor_name,
            ks.title,
            ks.content,
            ks.resource_type,
            ks.metadata,
            ks.status,
            ks.admin_feedback,
            ks.reviewed_by,
            ks.reviewed_at,
            ks.created_at,
            ks.updated_at
        FROM knowledge_submissions ks
        JOIN users u ON u.id = ks.contributor_id
        WHERE ks.contributor_id = $1
          AND ($2::text IS NULL OR ks.status = $2)
        ORDER BY ks.created_at DESC
        LIMIT $3 OFFSET $4
        "#,
        user_id,
        status_filter.as_deref(),
        limit,
        offset,
    )
    .fetch_all(&state.db)
    .await?;

    let count_row = sqlx::query!(
        r#"
        SELECT COUNT(*) as "count!"
        FROM knowledge_submissions
        WHERE contributor_id = $1
          AND ($2::text IS NULL OR status = $2)
        "#,
        user_id,
        status_filter.as_deref(),
    )
    .fetch_one(&state.db)
    .await?;

    let items: Vec<SubmissionItem> = rows
        .into_iter()
        .map(|r| SubmissionItem {
            id: r.id,
            contributor_id: r.contributor_id,
            contributor_email: Some(r.contributor_email),
            contributor_name: r.contributor_name,
            title: r.title,
            content: r.content,
            resource_type: r.resource_type,
            metadata: r.metadata,
            status: r.status,
            admin_feedback: r.admin_feedback,
            reviewed_by: r.reviewed_by,
            reviewed_at: r.reviewed_at,
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
        .collect();

    Ok(Json(QueueListResponse {
        items,
        total: count_row.count,
    }))
}

// ============================================================================
// GET /resources/submissions
// ============================================================================

/// List submissions in the queue
/// Accessible by Admins only
pub async fn list_queue(
    State(state): State<AppState>,
    Query(params): Query<QueueListQuery>,
) -> Result<Json<QueueListResponse>, SubmissionError> {
    let limit = params.limit.unwrap_or(20).min(100).max(1);
    let offset = params.offset.unwrap_or(0).max(0);
    let status_filter = params.status.unwrap_or_else(|| "pending".to_string());

    // Fetch submissions with contributor info via JOIN
    let rows = sqlx::query!(
        r#"
        SELECT
            ks.id,
            ks.contributor_id,
            u.email as contributor_email,
            u.name as contributor_name,
            ks.title,
            ks.content,
            ks.resource_type,
            ks.metadata,
            ks.status,
            ks.admin_feedback,
            ks.reviewed_by,
            ks.reviewed_at,
            ks.created_at,
            ks.updated_at
        FROM knowledge_submissions ks
        JOIN users u ON u.id = ks.contributor_id
        WHERE ks.status = $1
        ORDER BY ks.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        status_filter,
        limit,
        offset,
    )
    .fetch_all(&state.db)
    .await?;

    // Get total count for the status filter
    let count_row = sqlx::query!(
        r#"
        SELECT COUNT(*) as "count!" FROM knowledge_submissions WHERE status = $1
        "#,
        status_filter,
    )
    .fetch_one(&state.db)
    .await?;

    let items: Vec<SubmissionItem> = rows
        .into_iter()
        .map(|r| SubmissionItem {
            id: r.id,
            contributor_id: r.contributor_id,
            contributor_email: Some(r.contributor_email),
            contributor_name: r.contributor_name,
            title: r.title,
            content: r.content,
            resource_type: r.resource_type,
            metadata: r.metadata,
            status: r.status,
            admin_feedback: r.admin_feedback,
            reviewed_by: r.reviewed_by,
            reviewed_at: r.reviewed_at,
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
        .collect();

    Ok(Json(QueueListResponse {
        items,
        total: count_row.count,
    }))
}

// ============================================================================
// POST /resources/submissions/:id/review
// ============================================================================

/// Review a submission (approve or reject)
/// Accessible by Admins only
pub async fn review_submission(
    State(state): State<AppState>,
    Extension(admin_id): Extension<Uuid>,
    Path(submission_id): Path<Uuid>,
    Json(req): Json<ReviewRequest>,
) -> Result<Json<ReviewResponse>, SubmissionError> {
    // Validate review action
    req.validate()?;

    let mut tx = state.db.begin().await?;

    // Lock the submission row so review actions cannot race each other.
    let submission = sqlx::query!(
        r#"
        SELECT id, contributor_id, title, content, resource_type, metadata, status
        FROM knowledge_submissions
        WHERE id = $1
        FOR UPDATE
        "#,
        submission_id,
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(SubmissionError::NotFound)?;

    // Ensure it hasn't already been reviewed
    if submission.status != "pending" {
        return Err(SubmissionError::AlreadyReviewed);
    }

    let action = req.action.to_lowercase();

    match action.as_str() {
        "approve" => {
            // Forward to intelligence service first so DB state only flips to
            // approved when ingestion has actually been accepted.
            let mut client = state.intelligence_client.clone();
            let resource_id = Uuid::new_v4().to_string();

            let content = match submission.resource_type.as_str() {
                "url" => Some(pb::add_resource_request::Content::Url(submission.content.clone())),
                "text" | "markdown" | "html" | "code" => {
                    Some(pb::add_resource_request::Content::Text(submission.content.clone()))
                }
                _ => Some(pb::add_resource_request::Content::Text(submission.content.clone())),
            };

            let resource_type = match submission.resource_type.as_str() {
                "url" => pb::ResourceType::Website,
                "text" => pb::ResourceType::Text,
                "markdown" => pb::ResourceType::Markdown,
                "html" => pb::ResourceType::Html,
                "code" => pb::ResourceType::Code,
                _ => pb::ResourceType::Text,
            };

            let mut metadata: std::collections::HashMap<String, String> = submission
                .metadata
                .as_object()
                .map(|obj| {
                    obj.iter()
                        .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                        .collect()
                })
                .unwrap_or_default();

            metadata.insert("title".to_string(), submission.title.clone());
            metadata.insert("original_type".to_string(), submission.resource_type.clone());
            metadata.insert("source".to_string(), "contributor_submission".to_string());
            metadata.insert("submission_id".to_string(), submission_id.to_string());

            let grpc_req = pb::AddResourceRequest {
                user_id: submission.contributor_id.to_string(),
                resource_id: resource_id.clone(),
                content,
                r#type: resource_type as i32,
                title: Some(submission.title.clone()),
                metadata,
                config: Some(pb::IngestionConfig {
                    chunk_size: Some(1000),
                    chunk_overlap: Some(200),
                    auto_clean: Some(true),
                    generate_embeddings: Some(true),
                    max_depth: Some(1),
                    follow_links: Some(false),
                }),
                is_global: false,
            };

            let grpc_response = client
                .add_resource(grpc_req)
                .await
                .map_err(|e| SubmissionError::GrpcError(e.to_string()))?
                .into_inner();

            sqlx::query!(
                r#"
                UPDATE knowledge_submissions
                SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), admin_feedback = $2, updated_at = NOW()
                WHERE id = $3
                "#,
                admin_id,
                req.feedback,
                submission_id,
            )
            .execute(&mut *tx)
            .await?;

            tx.commit().await?;

            Ok(Json(ReviewResponse {
                submission_id,
                status: "approved".to_string(),
                message: "Submission approved and sent to ingestion pipeline".to_string(),
                resource_id: Some(grpc_response.resource_id),
                job_id: Some(grpc_response.job_id),
            }))
        }
        "reject" => {
            sqlx::query!(
                r#"
                UPDATE knowledge_submissions
                SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), admin_feedback = $2, updated_at = NOW()
                WHERE id = $3
                "#,
                admin_id,
                req.feedback,
                submission_id,
            )
            .execute(&mut *tx)
            .await?;

            tx.commit().await?;

            Ok(Json(ReviewResponse {
                submission_id,
                status: "rejected".to_string(),
                message: "Submission rejected".to_string(),
                resource_id: None,
                job_id: None,
            }))
        }
        _ => Err(SubmissionError::InvalidAction(action)),
    }
}
