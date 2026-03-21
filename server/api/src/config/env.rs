use std::env;

/// Centralized environment configuration
#[derive(Debug, Clone)]
pub struct Config {
    pub database: DatabaseConfig,
    pub server: ServerConfig,
    pub oauth: OAuthConfig,
    pub email: EmailConfig,
    pub security: SecurityConfig,
    pub cors: CorsConfig,
    pub rate_limit: RateLimitConfig,
    /// When false, all message quota checks are bypassed.
    /// Set USAGE_LIMITS_ENABLED=false for self-hosted / local deployments.
    pub usage_limits_enabled: bool,
}

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub url: String,
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone)]
pub struct OAuthConfig {
    pub google: GoogleOAuthConfig,
    pub microsoft: MicrosoftOAuthConfig,
    pub github: GitHubOAuthConfig,
    pub discord: DiscordOAuthConfig,
    pub x: XOAuthConfig,
    pub frontend_callback_url: String,
}

#[derive(Debug, Clone)]
pub struct GoogleOAuthConfig {
    pub enabled: bool,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_url: String,
}

#[derive(Debug, Clone)]
pub struct MicrosoftOAuthConfig {
    pub enabled: bool,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_url: String,
}

#[derive(Debug, Clone)]
pub struct GitHubOAuthConfig {
    pub enabled: bool,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_url: String,
}

#[derive(Debug, Clone)]
pub struct DiscordOAuthConfig {
    pub enabled: bool,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_url: String,
}

#[derive(Debug, Clone)]
pub struct XOAuthConfig {
    pub enabled: bool,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_url: String,
}

#[derive(Debug, Clone)]
pub struct EmailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub from_email: String,
    pub frontend_url: String,
    pub api_url: String,
    pub contact_email: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SecurityConfig {
    pub session_expiry_seconds: u64,
    pub verification_token_expiry_seconds: u64,
    pub password_reset_token_expiry_seconds: u64,
}

#[derive(Debug, Clone)]
pub struct CorsConfig {
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub max_requests: u32,
    pub window_seconds: u64,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            database: DatabaseConfig::from_env()?,
            server: ServerConfig::from_env()?,
            oauth: OAuthConfig::from_env()?,
            email: EmailConfig::from_env()?,
            security: SecurityConfig::from_env()?,
            cors: CorsConfig::from_env()?,
            rate_limit: RateLimitConfig::from_env()?,
            usage_limits_enabled: env::var("USAGE_LIMITS_ENABLED")
                .map(|v| v.to_lowercase() != "false")
                .unwrap_or(true),
        })
    }
}

impl DatabaseConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            url: env::var("DATABASE_URL")?,
        })
    }
}

impl ServerConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            host: env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("SERVER_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(4000),
        })
    }
}

impl OAuthConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            google: GoogleOAuthConfig::from_env()?,
            microsoft: MicrosoftOAuthConfig::from_env()?,
            github: GitHubOAuthConfig::from_env()?,
            discord: DiscordOAuthConfig::from_env()?,
            x: XOAuthConfig::from_env()?,
            frontend_callback_url: env::var("OAUTH_FRONTEND_CALLBACK_URL")
                .unwrap_or_else(|_| {
                    format!(
                        "{}/auth/callback",
                        env::var("FRONTEND_URL")
                            .unwrap_or_else(|_| "http://localhost:3000".to_string())
                            .trim_end_matches('/')
                    )
                }),
        })
    }
}

impl GoogleOAuthConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            enabled: env::var("GOOGLE_OAUTH_ENABLE")
                .map(|v| v.to_lowercase() != "false")
                .unwrap_or(true),
            client_id: env::var("GOOGLE_CLIENT_ID")?,
            client_secret: env::var("GOOGLE_CLIENT_SECRET")?,
            redirect_url: env::var("GOOGLE_REDIRECT_URL")
                .unwrap_or_else(|_| "http://localhost:4000/auth/oauth/google/callback".to_string()),
        })
    }
}

impl MicrosoftOAuthConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            enabled: env::var("MICROSOFT_OAUTH_ENABLE")
                .map(|v| v.to_lowercase() != "false")
                .unwrap_or(true),
            client_id: env::var("MICROSOFT_CLIENT_ID")?,
            client_secret: env::var("MICROSOFT_CLIENT_SECRET")?,
            redirect_url: env::var("MICROSOFT_REDIRECT_URL")
                .unwrap_or_else(|_| "http://localhost:4000/auth/oauth/microsoft/callback".to_string()),
        })
    }
}

impl GitHubOAuthConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            enabled: env::var("GITHUB_OAUTH_ENABLE")
                .map(|v| v.to_lowercase() != "false")
                .unwrap_or(true),
            client_id: env::var("GITHUB_CLIENT_ID")?,
            client_secret: env::var("GITHUB_CLIENT_SECRET")?,
            redirect_url: env::var("GITHUB_REDIRECT_URL")
                .unwrap_or_else(|_| "http://localhost:4000/auth/oauth/github/callback".to_string()),
        })
    }
}

impl DiscordOAuthConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            enabled: env::var("DISCORD_OAUTH_ENABLE")
                .map(|v| v.to_lowercase() != "false")
                .unwrap_or(true),
            client_id: env::var("DISCORD_CLIENT_ID")?,
            client_secret: env::var("DISCORD_CLIENT_SECRET")?,
            redirect_url: env::var("DISCORD_REDIRECT_URL")
                .unwrap_or_else(|_| "http://localhost:4000/auth/oauth/discord/callback".to_string()),
        })
    }
}

impl XOAuthConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            enabled: env::var("X_OAUTH_ENABLE")
                .map(|v| v.to_lowercase() != "false")
                .unwrap_or(true),
            client_id: env::var("X_CLIENT_ID")?,
            client_secret: env::var("X_CLIENT_SECRET")?,
            redirect_url: env::var("X_REDIRECT_URL")
                .unwrap_or_else(|_| "http://localhost:4000/auth/oauth/x/callback".to_string()),
        })
    }
}

impl EmailConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            smtp_host: env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string()),
            smtp_port: env::var("SMTP_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(587),
            smtp_username: env::var("SMTP_USERNAME").unwrap_or_default(),
            smtp_password: env::var("SMTP_PASSWORD").unwrap_or_default(),
            from_email: env::var("FROM_EMAIL")
                .unwrap_or_else(|_| "noreply@example.com".to_string()),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            api_url: env::var("API_URL").unwrap_or_else(|_| "http://localhost:4000".to_string()),
            contact_email: env::var("CONTACT_EMAIL").ok(),
        })
    }
}

impl SecurityConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            session_expiry_seconds: env::var("SESSION_EXPIRY_SECONDS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(2592000), // 30 days
            verification_token_expiry_seconds: env::var("VERIFICATION_TOKEN_EXPIRY_SECONDS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(86400), // 24 hours
            password_reset_token_expiry_seconds: env::var("PASSWORD_RESET_TOKEN_EXPIRY_SECONDS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3600), // 1 hour
        })
    }
}

impl CorsConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let origins = env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000".to_string());

        Ok(Self {
            allowed_origins: origins.split(',').map(|s| s.trim().to_string()).collect(),
        })
    }
}

impl RateLimitConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            max_requests: env::var("RATE_LIMIT_MAX_REQUESTS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(100),
            window_seconds: env::var("RATE_LIMIT_WINDOW_SECONDS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(60),
        })
    }
}
