//! Chat-domain queries: quota reads.

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

// ── Conversations ────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct ConversationRow {
    pub id: Uuid,
    pub user_id: String,
    pub title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct ConversationMeta {
    pub id: Uuid,
    pub title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct MessageRow {
    pub id: Uuid,
    pub role: String,
    pub content: String,
    pub sources: serde_json::Value,
    #[allow(dead_code)]
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug)]
pub struct ConversationListRow {
    pub id: Uuid,
    pub title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub message_count: i64,
    pub last_message_preview: Option<String>,
}

pub async fn create_conversation(
    db: &PgPool,
    id: Uuid,
    user_id: &str,
    title: Option<String>,
    metadata: serde_json::Value,
) -> Result<ConversationRow, sqlx::Error> {
    sqlx::query_as!(
        ConversationRow,
        r#"
        INSERT INTO conversations (id, user_id, title, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, title, created_at, updated_at
        "#,
        id,
        user_id,
        title,
        metadata
    )
    .fetch_one(db)
    .await
}

pub async fn get_owned_meta(
    db: &PgPool,
    conversation_id: Uuid,
    user_id: &str,
) -> Result<Option<ConversationMeta>, sqlx::Error> {
    sqlx::query_as!(
        ConversationMeta,
        r#"
        SELECT id, title, created_at, updated_at
        FROM conversations
        WHERE id = $1 AND user_id = $2
        "#,
        conversation_id,
        user_id
    )
    .fetch_optional(db)
    .await
}

pub async fn get_messages(
    db: &PgPool,
    conversation_id: Uuid,
) -> Result<Vec<MessageRow>, sqlx::Error> {
    sqlx::query_as!(
        MessageRow,
        r#"
        SELECT id, role::text as "role!", content, sources, metadata, created_at, parent_id
        FROM chat_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        "#,
        conversation_id
    )
    .fetch_all(db)
    .await
}

pub async fn list_conversations(
    db: &PgPool,
    user_id: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<ConversationListRow>, sqlx::Error> {
    sqlx::query_as!(
        ConversationListRow,
        r#"
        SELECT c.id, c.title, c.created_at, c.updated_at,
               (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) as "message_count!",
               (SELECT content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as "last_message_preview"
        FROM conversations c
        WHERE c.user_id = $1
        ORDER BY c.updated_at DESC
        LIMIT $2 OFFSET $3
        "#,
        user_id,
        limit,
        offset
    )
    .fetch_all(db)
    .await
}

pub async fn count_conversations(db: &PgPool, user_id: &str) -> Result<i64, sqlx::Error> {
    let row = sqlx::query!(
        r#"SELECT COUNT(*) as count FROM conversations WHERE user_id = $1"#,
        user_id
    )
    .fetch_one(db)
    .await?;
    Ok(row.count.unwrap_or(0))
}

pub async fn conversation_exists(
    db: &PgPool,
    conversation_id: Uuid,
    user_id: &str,
) -> Result<bool, sqlx::Error> {
    let row = sqlx::query!(
        "SELECT id FROM conversations WHERE id = $1 AND user_id = $2",
        conversation_id,
        user_id
    )
    .fetch_optional(db)
    .await?;
    Ok(row.is_some())
}

pub async fn update_title(
    db: &PgPool,
    conversation_id: Uuid,
    user_id: &str,
    title: Option<String>,
) -> Result<Option<ConversationRow>, sqlx::Error> {
    sqlx::query_as!(
        ConversationRow,
        r#"
        UPDATE conversations
        SET title = COALESCE($3, title),
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, title, created_at, updated_at
        "#,
        conversation_id,
        user_id,
        title
    )
    .fetch_optional(db)
    .await
}

pub async fn message_count(db: &PgPool, conversation_id: Uuid) -> Result<i64, sqlx::Error> {
    let n = sqlx::query_scalar!(
        r#"SELECT COUNT(*) FROM chat_messages WHERE conversation_id = $1"#,
        conversation_id
    )
    .fetch_one(db)
    .await?;
    Ok(n.unwrap_or(0))
}

pub async fn delete_conversation(db: &PgPool, conversation_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!("DELETE FROM conversations WHERE id = $1", conversation_id)
        .execute(db)
        .await?;
    Ok(())
}
