use crate::config::env::GoogleOAuthConfig;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl, basic::BasicClient};

/// Build Google OAuth client
pub fn build_client(config: &GoogleOAuthConfig) -> Result<BasicClient, Box<dyn std::error::Error>> {
    let client = BasicClient::new(
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
        AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())?,
        Some(TokenUrl::new(
            "https://oauth2.googleapis.com/token".to_string(),
        )?),
    )
    .set_redirect_uri(RedirectUrl::new(config.redirect_url.clone())?);

    Ok(client)
}

/// Google user info structure
#[derive(Debug, serde::Deserialize)]
pub struct GoogleUserInfo {
    pub sub: String, // Google user ID
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
    pub email_verified: bool,
}

/// Fetch user info from Google
pub async fn fetch_user_info(
    access_token: &str,
) -> Result<GoogleUserInfo, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await?;

    let user_info: GoogleUserInfo = response.json().await?;
    Ok(user_info)
}
