use serde::{Deserialize, Serialize};
use sqlx::Type;

/// User role for authorization
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
#[derive(Default)]
pub enum Role {
    #[serde(rename = "user")]
    #[default]
    User,
    #[serde(rename = "admin")]
    Admin,
    #[serde(rename = "contributor")]
    Contributor,
}

impl Role {
    /// Check if role is admin
    pub fn is_admin(&self) -> bool {
        matches!(self, Role::Admin)
    }

    /// Check if role is user
    #[allow(dead_code)]
    pub fn is_user(&self) -> bool {
        matches!(self, Role::User)
    }

    /// Check if role is contributor
    #[allow(dead_code)]
    pub fn is_contributor(&self) -> bool {
        matches!(self, Role::Contributor)
    }

    /// Check if role can submit resources (contributor or admin)
    pub fn can_submit_resources(&self) -> bool {
        matches!(self, Role::Contributor | Role::Admin)
    }
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::User => write!(f, "user"),
            Role::Admin => write!(f, "admin"),
            Role::Contributor => write!(f, "contributor"),
        }
    }
}

impl From<String> for Role {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "admin" => Role::Admin,
            "contributor" => Role::Contributor,
            _ => Role::User,
        }
    }
}
