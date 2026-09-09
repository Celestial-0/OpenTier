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
    let (submission_id, created_at) = crate::infra::postgres::resource_repo::create_submission(
        &state.db,
        user_id,
        req.title,
        req.content,
        req.resource_type.to_lowercase(),
        metadata_json,
    )
    .await?;

    Ok(Json(SubmitResourceResponse {
        submission_id,
        status: "pending".to_string(),
        message: "Resource submitted for review".to_string(),
        created_at,
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
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = params.offset.unwrap_or(0).max(0);
    let status_filter = params.status;

    let rows = crate::infra::postgres::resource_repo::list_mine(
        &state.db,
        user_id,
        status_filter.as_deref(),
        limit,
        offset,
    )
    .await?;

    let total = crate::infra::postgres::resource_repo::count_mine(
        &state.db,
        user_id,
        status_filter.as_deref(),
    )
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

    Ok(Json(QueueListResponse { items, total }))
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
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = params.offset.unwrap_or(0).max(0);
    let status_filter = params.status.unwrap_or_else(|| "pending".to_string());

    // Fetch submissions with contributor info via JOIN
    let rows = crate::infra::postgres::resource_repo::list_by_status(
        &state.db,
        &status_filter,
        limit,
        offset,
    )
    .await?;

    // Get total count for the status filter
    let total =
        crate::infra::postgres::resource_repo::count_by_status(&state.db, &status_filter).await?;

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

    Ok(Json(QueueListResponse { items, total }))
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
    let submission = crate::infra::postgres::resource_repo::lock_for_review(&mut tx, submission_id)
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
                "url" => Some(pb::add_resource_request::Content::Url(
                    submission.content.clone(),
                )),
                "text" | "markdown" | "html" | "code" => Some(
                    pb::add_resource_request::Content::Text(submission.content.clone()),
                ),
                _ => Some(pb::add_resource_request::Content::Text(
                    submission.content.clone(),
                )),
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
            metadata.insert(
                "original_type".to_string(),
                submission.resource_type.clone(),
            );
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

            crate::infra::postgres::resource_repo::mark_approved(
                &mut tx,
                admin_id,
                req.feedback,
                submission_id,
            )
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
            crate::infra::postgres::resource_repo::mark_rejected(
                &mut tx,
                admin_id,
                req.feedback,
                submission_id,
            )
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
