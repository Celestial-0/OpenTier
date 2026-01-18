pub mod github;
pub mod google;
pub mod handlers;
pub mod service;

pub use handlers::*;

use crate::config::env::OAuthConfig;
use oauth2::basic::BasicClient;

/// OAuth provider enum
#[derive(Debug, Clone, Copy)]
pub enum Provider {
    Google,
    GitHub,
}

impl Provider {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "google" => Some(Provider::Google),
            "github" => Some(Provider::GitHub),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Provider::Google => "google",
            Provider::GitHub => "github",
        }
    }
}

/// Build OAuth client for a provider
pub fn build_oauth_client(
    provider: Provider,
    config: &OAuthConfig,
) -> Result<BasicClient, Box<dyn std::error::Error>> {
    match provider {
        Provider::Google => google::build_client(&config.google),
        Provider::GitHub => github::build_client(&config.github),
    }
}
