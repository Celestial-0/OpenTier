//! Redis access with a circuit breaker.
//!
//! Every cache operation is wrapped: when Redis is degraded the breaker opens
//! and callers receive [`RedisError::CircuitOpen`] so they can fall back to
//! the authoritative Postgres path. Redis is never authoritative.

use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::time::Duration;

use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Script};

const SLIDING_WINDOW_LUA: &str = r#"
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window_ms)
if redis.call('ZCARD', key) >= limit then
    return 0
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window_ms)
return 1
"#;

const RELEASE_LOCK_LUA: &str = r#"
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
"#;

/// Circuit-breaker decision at a point in time.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BreakerDecision {
    Allow,
    Reject,
}

/// Minimal consecutive-failure circuit breaker with a cooldown probe.
///
/// Pure state machine — unit-testable without I/O.
pub struct CircuitBreaker {
    failure_threshold: u32,
    cooldown: Duration,
    consecutive_failures: AtomicU32,
    /// Unix millis when the breaker opened; 0 = closed.
    opened_at_ms: AtomicU64,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, cooldown: Duration) -> Self {
        Self {
            failure_threshold,
            cooldown,
            consecutive_failures: AtomicU32::new(0),
            opened_at_ms: AtomicU64::new(0),
        }
    }

    pub(crate) fn now_millis() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0)
    }

    pub fn check(&self) -> BreakerDecision {
        let opened_at = self.opened_at_ms.load(Ordering::Relaxed);
        if opened_at == 0 {
            return BreakerDecision::Allow;
        }
        if Self::now_millis() - opened_at >= self.cooldown.as_millis() as u64 {
            // Cooldown elapsed: allow a probe through (half-open).
            return BreakerDecision::Allow;
        }
        BreakerDecision::Reject
    }

    pub fn record_success(&self) {
        self.consecutive_failures.store(0, Ordering::Relaxed);
        self.opened_at_ms.store(0, Ordering::Relaxed);
    }

    pub fn record_failure(&self) {
        let failures = self.consecutive_failures.fetch_add(1, Ordering::Relaxed) + 1;
        if failures >= self.failure_threshold {
            self.opened_at_ms
                .compare_exchange(0, Self::now_millis(), Ordering::Relaxed, Ordering::Relaxed)
                .ok();
        }
    }

    pub fn is_open(&self) -> bool {
        self.check() == BreakerDecision::Reject
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RedisError {
    #[error("redis circuit open; falling back to primary store")]
    CircuitOpen,
    #[error(transparent)]
    Redis(#[from] redis::RedisError),
}

/// Shared handle around an auto-reconnecting connection manager.
#[derive(Clone)]
pub struct RedisHandle {
    manager: ConnectionManager,
    breaker: std::sync::Arc<CircuitBreaker>,
    sliding_window: std::sync::Arc<Script>,
    release_lock: std::sync::Arc<Script>,
}

impl RedisHandle {
    pub async fn connect(url: &str) -> Result<Self, RedisError> {
        let manager = ConnectionManager::new(redis::Client::open(url.to_string())?).await?;
        Ok(Self {
            manager,
            breaker: std::sync::Arc::new(CircuitBreaker::new(5, Duration::from_secs(10))),
            sliding_window: std::sync::Arc::new(Script::new(SLIDING_WINDOW_LUA)),
            release_lock: std::sync::Arc::new(Script::new(RELEASE_LOCK_LUA)),
        })
    }

    /// Run an operation unless the breaker is open; record the outcome.
    pub async fn exec<T, F, Fut>(&self, op: F) -> Result<T, RedisError>
    where
        F: FnOnce(ConnectionManager) -> Fut,
        Fut: std::future::Future<Output = redis::RedisResult<T>>,
    {
        if self.breaker.check() == BreakerDecision::Reject {
            return Err(RedisError::CircuitOpen);
        }
        match op(self.manager.clone()).await {
            Ok(value) => {
                self.breaker.record_success();
                Ok(value)
            }
            Err(e) => {
                self.breaker.record_failure();
                tracing::warn!(error = %e, "redis operation failed");
                Err(RedisError::from(e))
            }
        }
    }

    pub async fn get_string(&self, key: &str) -> Result<Option<String>, RedisError> {
        self.exec(|mut c| async move { c.get(key).await }).await
    }

    /// True when the breaker is open (callers can skip Redis work entirely).
    pub fn is_open(&self) -> bool {
        self.breaker.is_open()
    }

    pub async fn set_ex_string(
        &self,
        key: &str,
        value: &str,
        ttl_secs: u64,
    ) -> Result<(), RedisError> {
        self.exec(|mut c| async move {
            let _: () = c.set_ex(key, value, ttl_secs).await?;
            Ok(())
        })
        .await
    }

    pub async fn del(&self, keys: &[String]) -> Result<(), RedisError> {
        let owned = keys.to_vec();
        self.exec(move |mut c| async move {
            let _: () = c.del(owned).await?;
            Ok(())
        })
        .await
    }

    pub async fn sadd(&self, key: &str, member: &str) -> Result<(), RedisError> {
        self.exec(|mut c| async move {
            let _: () = c.sadd(key, member).await?;
            Ok(())
        })
        .await
    }

    pub async fn smembers(&self, key: &str) -> Result<Vec<String>, RedisError> {
        self.exec(|mut c| async move { c.smembers(key).await })
            .await
    }

    /// Distributed sliding-window limiter: true = allowed within `limit` per
    /// `window` for the bucket `key`. Atomic via Lua.
    pub async fn sliding_window_allow(
        &self,
        key: &str,
        limit: i64,
        window: Duration,
    ) -> Result<bool, RedisError> {
        let script = self.sliding_window.clone();
        let member = uuid::Uuid::new_v4().to_string();
        let now_ms = CircuitBreaker::now_millis() as i64;
        let window_ms = window.as_millis() as i64;
        self.exec(move |mut c| async move {
            script
                .key(key)
                .arg(now_ms)
                .arg(window_ms)
                .arg(limit)
                .arg(member)
                .invoke_async(&mut c)
                .await
        })
        .await
        .map(|allowed: i32| allowed == 1)
    }

    /// Acquire a lock (`SET NX PX`) with an owner token. Returns None on contention.
    pub async fn try_acquire_lock(
        &self,
        key: &str,
        owner_token: &str,
        ttl: Duration,
    ) -> Result<Option<String>, RedisError> {
        let owner = owner_token.to_string();
        let ttl_ms = ttl.as_millis() as u64;
        self.exec(move |mut c| async move {
            let acquired: Option<String> = redis::cmd("SET")
                .arg(key)
                .arg(&owner)
                .arg("NX")
                .arg("PX")
                .arg(ttl_ms)
                .query_async(&mut c)
                .await?;
            Ok(acquired.map(|_| owner))
        })
        .await
    }

    /// Release a lock only if we still own it (compare-and-delete).
    pub async fn release_lock(&self, key: &str, owner_token: &str) -> Result<bool, RedisError> {
        let script = self.release_lock.clone();
        let owner = owner_token.to_string();
        self.exec(move |mut c| async move { script.key(key).arg(owner).invoke_async(&mut c).await })
            .await
            .map(|released: i32| released == 1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn breaker_stays_closed_under_threshold() {
        let b = CircuitBreaker::new(3, Duration::from_secs(10));
        b.record_failure();
        b.record_failure();
        assert_eq!(b.check(), BreakerDecision::Allow);
        assert!(!b.is_open());
    }

    #[test]
    fn breaker_opens_at_threshold_and_recovers_after_cooldown() {
        let b = CircuitBreaker::new(2, Duration::from_millis(20));
        b.record_failure();
        b.record_failure();
        assert!(b.is_open());

        std::thread::sleep(Duration::from_millis(30));
        assert_eq!(b.check(), BreakerDecision::Allow);
    }

    #[test]
    fn success_resets_failure_count() {
        let b = CircuitBreaker::new(2, Duration::from_secs(10));
        b.record_failure();
        b.record_success();
        b.record_failure();
        assert!(!b.is_open());
    }
}
