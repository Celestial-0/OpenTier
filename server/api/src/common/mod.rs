pub mod background;
pub mod client_ip;
pub mod device;
pub mod events;
pub mod openapi;
pub mod problem;
pub mod timestamp;
pub mod validation;

/// Public API version 1 prefix (`/v1`). OpenTier strictly serves all versioned API routes under this prefix.
pub const API_V1_PREFIX: &str = "/v1";

