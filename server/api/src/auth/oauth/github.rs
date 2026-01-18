use crate::config::env::GitHubOAuthConfig;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl, basic::BasicClient};

/// Build GitHub OAuth client
pub fn build_client(config: &GitHubOAuthConfig) -> Result<BasicClient, Box<dyn std::error::Error>> {
    let client = BasicClient::new(
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
        AuthUrl::new("https://github.com/login/oauth/authorize".to_string())?,
        Some(TokenUrl::new(
            "https://github.com/login/oauth/access_token".to_string(),
        )?),
    )
    .set_redirect_uri(RedirectUrl::new(config.redirect_url.clone())?);

    Ok(client)
}

/// GitHub user info structure
#[derive(Debug, serde::Deserialize)]
pub struct GitHubUserInfo {
    pub id: i64,       // GitHub user ID
    pub login: String, // Username
    /// Email from user profile (may be null if private)
    #[allow(dead_code)]
    pub email: Option<String>,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

/// GitHub email structure
#[derive(Debug, serde::Deserialize)]
pub struct GitHubEmail {
    pub email: String,
    pub primary: bool,
    pub verified: bool,
}

/// Fetch user info from GitHub
pub async fn fetch_user_info(
    access_token: &str,
) -> Result<GitHubUserInfo, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/user")
        .bearer_auth(access_token)
        .header("User-Agent", "OpenTier-API")
        .send()
        .await?;

    let user_info: GitHubUserInfo = response.json().await?;
    Ok(user_info)
}

/// Fetch user emails from GitHub (needed because email might not be public)
pub async fn fetch_user_emails(
    access_token: &str,
) -> Result<Vec<GitHubEmail>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/user/emails")
        .bearer_auth(access_token)
        .header("User-Agent", "OpenTier-API")
        .send()
        .await?;

    let emails: Vec<GitHubEmail> = response.json().await?;
    Ok(emails)
}
