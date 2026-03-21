use crate::config::env::DiscordOAuthConfig;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl, basic::BasicClient};

/// Build Discord OAuth client
pub fn build_client(
    config: &DiscordOAuthConfig,
) -> Result<BasicClient, Box<dyn std::error::Error>> {
    let client = BasicClient::new(
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
        AuthUrl::new("https://discord.com/oauth2/authorize".to_string())?,
        Some(TokenUrl::new("https://discord.com/api/oauth2/token".to_string())?),
    )
    .set_redirect_uri(RedirectUrl::new(config.redirect_url.clone())?);

    Ok(client)
}

#[derive(Debug, serde::Deserialize)]
pub struct DiscordUserInfo {
    pub id: String,
    pub email: Option<String>,
    pub username: String,
    pub global_name: Option<String>,
    pub avatar: Option<String>,
    pub verified: Option<bool>,
}

/// Fetch user profile from Discord
pub async fn fetch_user_info(
    access_token: &str,
) -> Result<DiscordUserInfo, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://discord.com/api/users/@me")
        .bearer_auth(access_token)
        .send()
        .await?
        .error_for_status()?;

    let user_info: DiscordUserInfo = response.json().await?;
    Ok(user_info)
}

/// Build Discord avatar URL when available.
pub fn avatar_url(user_id: &str, avatar_hash: &Option<String>) -> Option<String> {
    avatar_hash
        .as_ref()
        .map(|hash| format!("https://cdn.discordapp.com/avatars/{}/{}.png", user_id, hash))
}
