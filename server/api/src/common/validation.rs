use once_cell::sync::Lazy;
use regex::Regex;

/// Email validation regex
static EMAIL_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap());

/// Validate email format
pub fn validate_email(email: &str) -> Result<(), String> {
    if email.is_empty() {
        return Err("Email cannot be empty".to_string());
    }

    if email.len() > 255 {
        return Err("Email too long (max 255 characters)".to_string());
    }

    if !EMAIL_REGEX.is_match(email) {
        return Err("Invalid email format".to_string());
    }

    Ok(())
}

/// Validate password strength
pub fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long".to_string());
    }

    if password.len() > 128 {
        return Err("Password too long (max 128 characters)".to_string());
    }

    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_numeric());

    if !has_uppercase || !has_lowercase || !has_digit {
        return Err("Password must contain uppercase, lowercase, and numbers".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(validate_email("test@example.com").is_ok());
        assert!(validate_email("user.name+tag@example.co.uk").is_ok());
        assert!(validate_email("invalid").is_err());
        assert!(validate_email("@example.com").is_err());
        assert!(validate_email("test@").is_err());
    }

    #[test]
    fn test_password_validation() {
        assert!(validate_password("Password123").is_ok());
        assert!(validate_password("short").is_err());
        assert!(validate_password("alllowercase123").is_err());
        assert!(validate_password("ALLUPPERCASE123").is_err());
        assert!(validate_password("NoNumbers").is_err());
    }
}
