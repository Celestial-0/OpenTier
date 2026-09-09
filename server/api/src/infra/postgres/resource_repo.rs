//! Knowledge-submission repository (R2 layering: SQL lives only here).

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug)]
pub struct SubmissionRecord {
    pub id: Uuid,
    pub contributor_id: Uuid,
    pub contributor_email: String,
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

#[derive(Debug)]
#[allow(dead_code)]
pub struct SubmissionLock {
    pub id: Uuid,
    pub contributor_id: Uuid,
    pub title: String,
    pub content: String,
    pub resource_type: String,
    pub metadata: serde_json::Value,
    pub status: String,
}

pub async fn create_submission(
    db: &PgPool,
    contributor_id: Uuid,
    title: String,
    content: String,
    resource_type: String,
    metadata: serde_json::Value,
) -> Result<(Uuid, DateTime<Utc>), sqlx::Error> {
    let row = sqlx::query!(
        r#"
        INSERT INTO knowledge_submissions (contributor_id, title, content, resource_type, metadata, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id, created_at
        "#,
        contributor_id,
        title,
        content,
        resource_type,
        metadata,
    )
    .fetch_one(db)
    .await?;
    Ok((row.id, row.created_at))
}

/// Submissions authored by one contributor, optionally filtered by status.
pub async fn list_mine(
    db: &PgPool,
    contributor_id: Uuid,
    status: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<SubmissionRecord>, sqlx::Error> {
    sqlx::query_as!(
        SubmissionRecord,
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
        contributor_id,
        status,
        limit,
        offset,
    )
    .fetch_all(db)
    .await
}

pub async fn count_mine(
    db: &PgPool,
    contributor_id: Uuid,
    status: Option<&str>,
) -> Result<i64, sqlx::Error> {
    let row = sqlx::query!(
        r#"
        SELECT COUNT(*) as "count!"
        FROM knowledge_submissions
        WHERE contributor_id = $1
          AND ($2::text IS NULL OR status = $2)
        "#,
        contributor_id,
        status,
    )
    .fetch_one(db)
    .await?;
    Ok(row.count)
}

/// Admin queue view for one status bucket.
pub async fn list_by_status(
    db: &PgPool,
    status: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<SubmissionRecord>, sqlx::Error> {
    sqlx::query_as!(
        SubmissionRecord,
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
        status,
        limit,
        offset,
    )
    .fetch_all(db)
    .await
}

pub async fn count_by_status(db: &PgPool, status: &str) -> Result<i64, sqlx::Error> {
    let row = sqlx::query!(
        r#"SELECT COUNT(*) as "count!" FROM knowledge_submissions WHERE status = $1"#,
        status,
    )
    .fetch_one(db)
    .await?;
    Ok(row.count)
}

/// Row-lock a submission inside the caller's transaction (review race guard).
pub async fn lock_for_review(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    submission_id: Uuid,
) -> Result<Option<SubmissionLock>, sqlx::Error> {
    sqlx::query_as!(
        SubmissionLock,
        r#"
        SELECT id, contributor_id, title, content, resource_type, metadata, status
        FROM knowledge_submissions
        WHERE id = $1
        FOR UPDATE
        "#,
        submission_id,
    )
    .fetch_optional(&mut **tx)
    .await
}

pub async fn mark_approved(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    admin_id: Uuid,
    feedback: Option<String>,
    submission_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE knowledge_submissions
        SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), admin_feedback = $2, updated_at = NOW()
        WHERE id = $3
        "#,
        admin_id,
        feedback,
        submission_id,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn mark_rejected(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    admin_id: Uuid,
    feedback: Option<String>,
    submission_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE knowledge_submissions
        SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), admin_feedback = $2, updated_at = NOW()
        WHERE id = $3
        "#,
        admin_id,
        feedback,
        submission_id,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}
