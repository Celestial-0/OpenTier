//! Redis-backed session cache.
//!
//! Hot auth paths resolve sessions through this cache (TTL 60s) instead of a
//! per-request `sessions` table lookup. Postgres remains authoritative:
//! revocation evicts explicitly, and any Redis outage falls back to the DB
//! via the circuit breaker.

use std::sync::Arc;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::{AuthError, Role, session, tokens};
use crate::infra::redis::RedisHandle;

const KEY_PREFIX: &str = "ot:api:sess:";
const USER_SET_PREFIX: &str = "ot:api:sess_u:";
const ENTRY_TTL_SECS: u64 = 60;

#[derive(Serialize, Deserialize)]
struct CachedSession {
    /// user id
    u: Uuid,
    /// role label
    r: String,
    /// expiry epoch seconds
    e: i64,
}

fn role_label(role: Role) -> String {
    match role {
        Role::User => "user".into(),
        Role::Contributor => "contributor".into(),
        Role::Admin => "admin".into(),
    }
}

fn role_from_label(label: &str) -> Option<Role> {
    match label {
        "user" => Some(Role::User),
        "contributor" => Some(Role::Contributor),
        "admin" => Some(Role::Admin),
        _ => None,
    }
}

#[derive(Clone)]
pub struct SessionCache {
    redis: Arc<RedisHandle>,
}

impl SessionCache {
    pub fn new(redis: Arc<RedisHandle>) -> Self {
        Self { redis }
    }

    fn key_for(token_hash: &str) -> String {
        format!("{KEY_PREFIX}{token_hash}")
    }

    fn user_set_key(user_id: Uuid) -> String {
        format!("{USER_SET_PREFIX}{user_id}")
    }

    /// Resolve `(user_id, role)` for a raw token: cache first, DB fallback.
    pub async fn resolve(&self, db: &PgPool, raw_token: &str) -> Result<(Uuid, Role), AuthError> {
        let token_hash = tokens::hash_token(raw_token);
        let key = Self::key_for(&token_hash);

        if let Ok(Some(json)) = self.redis.get_string(&key).await
            && let Ok(entry) = serde_json::from_str::<CachedSession>(&json)
        {
            if entry.e > Utc::now().timestamp()
                && let Some(role) = role_from_label(&entry.r)
            {
                return Ok((entry.u, role));
            }
            // Expired/unparseable entry: drop it and fall through to the DB.
            let _ = self.redis.del(std::slice::from_ref(&key)).await;
        }

        let resolved = session::get_user_from_session(db, raw_token).await?;

        // Best-effort populate; failures only cost the next request a DB hit.
        // DB row expiry is known only via an extra query, so we bound the
        // cached entry by TTL alone (≤60s stale window).
        self.store_hashed(
            &token_hash,
            resolved.0,
            resolved.1,
            Utc::now().timestamp() + ENTRY_TTL_SECS as i64,
        )
        .await;

        Ok(resolved)
    }

    /// Store a resolution keyed by the *hashed* token.
    pub async fn store_hashed(
        &self,
        token_hash: &str,
        user_id: Uuid,
        role: Role,
        expires_at_epoch: i64,
    ) {
        let now = Utc::now().timestamp();
        let exp = expires_at_epoch.min(now + ENTRY_TTL_SECS as i64);
        let ttl_secs = (exp - now).max(1) as u64;
        let entry = CachedSession {
            u: user_id,
            r: role_label(role),
            e: exp,
        };
        if let Ok(json) = serde_json::to_string(&entry) {
            let key = Self::key_for(token_hash);
            let _ = self.redis.set_ex_string(&key, &json, ttl_secs).await;
            let _ = self
                .redis
                .sadd(&Self::user_set_key(user_id), token_hash)
                .await;
        }
    }

    pub async fn evict_token_hash(&self, token_hash: &str) {
        let key = Self::key_for(token_hash);
        let _ = self.redis.del(&[key]).await;
    }

    /// Evict every cached session for `user_id` (used on password change /
    /// revoke-all). Sweeps the tracked hash set; TTL bounds any residue.
    pub async fn evict_user_all(&self, user_id: Uuid) {
        let set_key = Self::user_set_key(user_id);
        if let Ok(members) = self.redis.smembers(&set_key).await
            && !members.is_empty()
        {
            let keys: Vec<String> = members.iter().map(|h| Self::key_for(h)).collect();
            let _ = self.redis.del(&keys).await;
        }
        let _ = self.redis.del(&[set_key]).await;
    }
}
