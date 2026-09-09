//! Canonical event envelope for the Redis Streams backbone.
//!
//! Mirrors `server/intelligence/core/events.py` — keep both in lockstep:
//! `{event_id, event_type, occurred_at, correlation_id, payload}`.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Well-known stream names (`opentier:{domain}:{name}`).
#[allow(dead_code)]
pub mod streams {
    pub const CHAT_EVENTS: &str = "opentier:events:chat";
    pub const INGESTION_JOBS: &str = "opentier:jobs:ingestion";
    pub const LIFECYCLE_EVENTS: &str = "opentier:events:lifecycle";

    pub fn dlq(stream: &str) -> String {
        format!("{stream}:dlq")
    }
}

/// Versioned event types (`domain.event.vN`).
#[allow(dead_code)]
pub mod event_types {
    pub const CHAT_COMPLETED: &str = "chat.completed.v1";
    pub const USER_DELETED: &str = "user.deleted.v1";
    pub const RESOURCE_DELETED: &str = "resource.deleted.v1";
    pub const INGESTION_JOB_ENQUEUED: &str = "ingestion.job.enqueued.v1";
}

/// Envelope carried as the `envelope` JSON field of every stream entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope {
    pub event_id: Uuid,
    pub event_type: String,
    pub occurred_at: DateTime<Utc>,
    pub correlation_id: String,
    pub payload: serde_json::Value,
}

impl EventEnvelope {
    pub fn new(
        event_type: impl Into<String>,
        correlation_id: impl Into<String>,
        payload: serde_json::Value,
    ) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            event_type: event_type.into(),
            occurred_at: Utc::now(),
            correlation_id: correlation_id.into(),
            payload,
        }
    }

    /// Serialized envelope for the stream entry field.
    pub fn to_json(&self) -> serde_json::Result<String> {
        serde_json::to_string(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn roundtrips_envelope() {
        let env = EventEnvelope::new(
            event_types::CHAT_COMPLETED,
            "corr-123",
            json!({"conversation_id": "c1"}),
        );
        let json = env.to_json().unwrap();
        let parsed: EventEnvelope = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.event_id, env.event_id);
        assert_eq!(parsed.event_type, event_types::CHAT_COMPLETED);
        assert_eq!(parsed.correlation_id, "corr-123");
        assert_eq!(parsed.payload["conversation_id"], "c1");
    }

    #[test]
    fn dlq_names_are_suffixed() {
        assert_eq!(
            streams::dlq(streams::INGESTION_JOBS),
            "opentier:jobs:ingestion:dlq"
        );
    }
}
