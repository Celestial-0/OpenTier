//! Metrics-domain SQL (R2: statements live only under infra::postgres).

use sqlx::PgPool;

use crate::metrics::DataPoint;

pub async fn total_users(db: &PgPool) -> Result<i64, sqlx::Error> {
    let n = sqlx::query_scalar!("SELECT count(*) FROM users")
        .fetch_one(db)
        .await?;
    Ok(n.unwrap_or(0))
}

pub async fn active_users_24h(db: &PgPool) -> Result<i64, sqlx::Error> {
    let n = sqlx::query_scalar!(
        "SELECT count(*) FROM users WHERE updated_at > NOW() - INTERVAL '24 hours'"
    )
    .fetch_one(db)
    .await?;
    Ok(n.unwrap_or(0))
}

pub async fn total_conversations(db: &PgPool) -> Result<i64, sqlx::Error> {
    let n = sqlx::query_scalar!("SELECT count(*) FROM conversations")
        .fetch_one(db)
        .await?;
    Ok(n.unwrap_or(0))
}

pub async fn total_messages(db: &PgPool) -> Result<i64, sqlx::Error> {
    let n = sqlx::query_scalar!("SELECT count(*) FROM chat_messages")
        .fetch_one(db)
        .await?;
    Ok(n.unwrap_or(0))
}

pub struct DataPointRaw {
    pub label: String,
    pub value: i64,
}

fn to_points(rows: Vec<DataPointRaw>) -> Vec<DataPoint> {
    rows.into_iter()
        .map(|r| DataPoint {
            label: r.label,
            value: r.value as i32,
        })
        .collect()
}

pub async fn user_growth(db: &PgPool) -> Result<Vec<DataPoint>, sqlx::Error> {
    let rows = sqlx::query_as!(
        DataPointRaw,
        r#"
        SELECT
            trim(to_char(date_trunc('month', created_at), 'Month')) as "label!",
            count(*) as "value!"
        FROM users
        WHERE created_at > NOW() - INTERVAL '6 months'
        GROUP BY 1, date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
        "#
    )
    .fetch_all(db)
    .await?;
    Ok(to_points(rows))
}

pub async fn message_activity(db: &PgPool) -> Result<Vec<DataPoint>, sqlx::Error> {
    let rows = sqlx::query_as!(
        DataPointRaw,
        r#"
        SELECT
            to_char(date_trunc('day', created_at), 'Dy') as "label!",
            count(*) as "value!"
        FROM chat_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY 1, date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
        "#
    )
    .fetch_all(db)
    .await?;
    Ok(to_points(rows))
}
