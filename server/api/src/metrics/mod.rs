//! Metrics domain: platform health, growth, conversation activity, and credit telemetry.

pub mod errors;
pub mod handlers;
pub mod types;

#[allow(unused_imports)]
pub use errors::MetricsError;
pub use handlers::*;
#[allow(unused_imports)]
pub use types::*;
