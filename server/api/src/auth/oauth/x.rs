use crate::config::env::XOAuthConfig;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl, basic::BasicClient};

/// Build X (Twitter) OAuth2 client.
pub fn build_client(config: &XOAuthConfig) -> Result<BasicClient, Box<dyn std::error::Error>> {
    let client = BasicClient::new(
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
        AuthUrl::new("https://twitter.com/i/oauth2/authorize".to_string())?,
        Some(TokenUrl::new("https://api.x.com/2/oauth2/token".to_string())?),
    )
    .set_redirect_uri(RedirectUrl::new(config.redirect_url.clone())?);

    Ok(client)
}

#[derive(Debug, serde::Deserialize)]
pub struct XUserMeResponse {
    pub data: XUserInfo,
}

#[derive(Debug, serde::Deserialize)]
pub struct XUserInfo {
    pub id: String,
    pub name: Option<String>,
    pub username: String,
    pub profile_image_url: Option<String>,
    pub confirmed_email: Option<String>,
}

/// Fetch current user profile from X API v2.
pub async fn fetch_user_info(
    access_token: &str,
) -> Result<XUserInfo, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.x.com/2/users/me?user.fields=profile_image_url,confirmed_email")
        .bearer_auth(access_token)
        .send()
        .await?
        .error_for_status()?;

    let payload: XUserMeResponse = response.json().await?;
    Ok(payload.data)
}
