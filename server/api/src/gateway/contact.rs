use axum::extract::State;
use axum::http::StatusCode;
use axum::{Json, Router, routing::post};
use serde::{Deserialize, Serialize};

use crate::email::EmailService;
use crate::gateway::AppState;

#[derive(Deserialize)]
pub struct ContactRequest {
    pub name: String,
    pub email: String,
    pub subject: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct ContactResponse {
    pub success: bool,
    pub message: String,
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/", post(handle_contact))
}

async fn handle_contact(
    State(state): State<AppState>,
    Json(req): Json<ContactRequest>,
) -> Result<Json<ContactResponse>, (StatusCode, Json<ContactResponse>)> {
    // Basic validation
    if req.name.trim().is_empty()
        || req.email.trim().is_empty()
        || req.subject.trim().is_empty()
        || req.message.trim().is_empty()
    {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ContactResponse {
                success: false,
                message: "All fields are required.".to_string(),
            }),
        ));
    }

    let email_config = &state.config.email;
    let recipient = email_config
        .contact_email
        .as_deref()
        .unwrap_or(&email_config.from_email);

    let email_service = EmailService::new(email_config.clone());

    let html_body = format!(
        r#"
        <html>
            <body style="font-family: -apple-system, sans-serif; color: #222;">
                <h2>New Contact Form Submission</h2>
                <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Name</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">{}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Email</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;"><a href="mailto:{}">{}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Subject</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">{}</td>
                    </tr>
                </table>
                <h3 style="margin-top: 24px;">Message</h3>
                <div style="padding: 16px; background: #f9f9f9; border-radius: 8px; white-space: pre-wrap;">{}</div>
            </body>
        </html>
        "#,
        html_escape(&req.name),
        html_escape(&req.email),
        html_escape(&req.email),
        html_escape(&req.subject),
        html_escape(&req.message),
    );

    let subject = format!("[OpenTier Contact] {}", req.subject);

    match email_service.send_contact_email(recipient, &subject, &html_body).await {
        Ok(()) => {
            tracing::info!("Contact form submitted by {} <{}>", req.name, req.email);
            Ok(Json(ContactResponse {
                success: true,
                message: "Message sent successfully.".to_string(),
            }))
        }
        Err(e) => {
            tracing::error!("Failed to send contact email: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ContactResponse {
                    success: false,
                    message: "Failed to send message. Please try again later.".to_string(),
                }),
            ))
        }
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
