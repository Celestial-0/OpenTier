use crate::config::env::MicrosoftOAuthConfig;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl, basic::BasicClient};

/// Build Microsoft (Azure AD) OAuth client using the multi-tenant endpoint.
pub fn build_client(
    config: &MicrosoftOAuthConfig,
) -> Result<BasicClient, Box<dyn std::error::Error>> {
    let client = BasicClient::new(
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
        AuthUrl::new("https://login.microsoftonline.com/common/oauth2/v2.0/authorize".to_string())?,
        Some(TokenUrl::new(
            "https://login.microsoftonline.com/common/oauth2/v2.0/token".to_string(),
        )?),
    )
    .set_redirect_uri(RedirectUrl::new(config.redirect_url.clone())?);

    Ok(client)
}

#[derive(Debug, serde::Deserialize)]
pub struct MicrosoftUserInfo {
    pub sub: String,
    pub email: Option<String>,
    pub preferred_username: Option<String>,
    pub name: Option<String>,
    pub picture: Option<String>,
}

/// Fetch user profile from Microsoft OIDC userinfo endpoint.
pub async fn fetch_user_info(
    access_token: &str,
) -> Result<MicrosoftUserInfo, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://graph.microsoft.com/oidc/userinfo")
        .bearer_auth(access_token)
        .send()
        .await?
        .error_for_status()?;

    let user_info: MicrosoftUserInfo = response.json().await?;
    Ok(user_info)
}
