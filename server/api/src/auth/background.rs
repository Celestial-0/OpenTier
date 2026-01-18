use crate::common::background;
use sqlx::PgPool;

/// Start session cleanup background task
/// Runs every hour to remove expired sessions
pub fn start_session_cleanup_task(db: PgPool) {
    background::start_periodic_task(
        db,
        "Session cleanup",
        3600, // 1 hour
        |db| async move { super::session::cleanup_expired_sessions(&db).await },
    );
}
