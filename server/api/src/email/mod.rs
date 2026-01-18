use crate::config::env::EmailConfig;
use lettre::{
    Message, SmtpTransport, Transport, message::header::ContentType,
    transport::smtp::authentication::Credentials,
};

/// Email service for sending verification and reset emails
pub struct EmailService {
    smtp_host: String,
    smtp_port: u16,
    smtp_username: String,
    smtp_password: String,
    from_email: String,
}

impl EmailService {
    /// Create a new email service from config
    pub fn new(config: EmailConfig) -> Self {
        Self {
            smtp_host: config.smtp_host,
            smtp_port: config.smtp_port,
            smtp_username: config.smtp_username,
            smtp_password: config.smtp_password,
            from_email: config.from_email,
        }
    }

    /// Send verification email
    pub async fn send_verification_email(
        &self,
        to_email: &str,
        verification_token: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let verification_url = format!(
            "http://localhost:8000/auth/verify-email?token={}",
            verification_token
        );

        let email_body = format!(
            r#"
            <html>
                <body>
                    <h2>Verify Your Email</h2>
                    <p>Thank you for signing up! Please click the link below to verify your email address:</p>
                    <p><a href="{}">Verify Email</a></p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p>{}</p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                </body>
            </html>
            "#,
            verification_url, verification_url
        );

        self.send_email(to_email, "Verify Your Email Address", &email_body)
            .await
    }

    /// Send password reset email
    pub async fn send_password_reset_email(
        &self,
        to_email: &str,
        reset_token: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let reset_url = format!("http://localhost:8000/reset-password?token={}", reset_token);

        let email_body = format!(
            r#"
            <html>
                <body>
                    <h2>Reset Your Password</h2>
                    <p>We received a request to reset your password. Click the link below to create a new password:</p>
                    <p><a href="{}">Reset Password</a></p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p>{}</p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, you can safely ignore this email.</p>
                </body>
            </html>
            "#,
            reset_url, reset_url
        );

        self.send_email(to_email, "Reset Your Password", &email_body)
            .await
    }

    /// Internal method to send email via SMTP
    async fn send_email(
        &self,
        to_email: &str,
        subject: &str,
        html_body: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // If SMTP is not configured, just log the email
        if self.smtp_username.is_empty() {
            tracing::info!(
                "📧 Email would be sent to {}: {}\n{}",
                to_email,
                subject,
                html_body
            );
            return Ok(());
        }

        let email = Message::builder()
            .from(self.from_email.parse()?)
            .to(to_email.parse()?)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(html_body.to_string())?;

        let creds = Credentials::new(self.smtp_username.clone(), self.smtp_password.clone());

        let mailer = SmtpTransport::relay(&self.smtp_host)?
            .credentials(creds)
            .port(self.smtp_port)
            .build();

        mailer.send(&email)?;
        tracing::info!("✅ Email sent successfully to {}", to_email);

        Ok(())
    }
}
