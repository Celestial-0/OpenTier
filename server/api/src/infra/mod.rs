//! Infrastructure adapters (SQL, Redis, and external I/O live here).

pub mod billing;
pub mod outbox_relay;
pub mod postgres;
pub mod redis;
