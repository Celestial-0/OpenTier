pub mod discord;
pub mod github;
pub mod google;
pub mod handlers;
pub mod microsoft;
pub mod service;
pub mod x;

pub use handlers::{oauth_authorize, oauth_callback, oauth_exchange, oauth_get_providers};

use crate::config::env::OAuthConfig;
use oauth2::basic::BasicClient;

/// OAuth provider enum
#[derive(Debug, Clone, Copy)]
pub enum Provider {
    Google,
    Microsoft,
    GitHub,
    Discord,
    X,
}

impl Provider {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "google" => Some(Provider::Google),
            "microsoft" => Some(Provider::Microsoft),
            "azure" => Some(Provider::Microsoft),
            "azuread" => Some(Provider::Microsoft),
            "github" => Some(Provider::GitHub),
            "discord" => Some(Provider::Discord),
            "x" => Some(Provider::X),
            "twitter" => Some(Provider::X),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Provider::Google => "google",
            Provider::Microsoft => "microsoft",
            Provider::GitHub => "github",
            Provider::Discord => "discord",
            Provider::X => "x",
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
        Provider::Microsoft => microsoft::build_client(&config.microsoft),
        Provider::GitHub => github::build_client(&config.github),
        Provider::Discord => discord::build_client(&config.discord),
        Provider::X => x::build_client(&config.x),
    }
}
