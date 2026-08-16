use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;

pub async fn connect(database_url: &str) -> PgPool {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
        .expect("Failed to connect to Postgres");

    tracing::info!("🔄 Checking and running database migrations...");
    sqlx::migrate!("../db/migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");
    tracing::info!("✅ Database migrations are up to date");

    pool
}
