use sqlx::PgPool;
use std::time::Duration;

/// Generic background task runner
/// Executes a cleanup function periodically at specified intervals
pub fn start_periodic_task<F, Fut>(
    db: PgPool,
    task_name: &'static str,
    interval_seconds: u64,
    cleanup_fn: F,
) where
    F: Fn(PgPool) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = Result<u64, sqlx::Error>> + Send + 'static,
{
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(interval_seconds));

        loop {
            interval.tick().await;

            // Pass cloned db to the cleanup function
            match cleanup_fn(db.clone()).await {
                Ok(count) => {
                    if count > 0 {
                        tracing::info!("🧹 {} cleaned up {} items", task_name, count);
                    }
                }
                Err(e) => {
                    tracing::error!("{} failed: {:?}", task_name, e);
                }
            }
        }
    });

    tracing::info!(
        "✅ {} started (runs every {}s)",
        task_name,
        interval_seconds
    );
}
