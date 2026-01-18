use super::AuthError;

/// Hash a password using bcrypt
pub fn hash_password(password: &str) -> Result<String, AuthError> {
    bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|_| AuthError::HashError)
}

/// Verify a password against a bcrypt hash
pub fn verify_password(password: &str, hash: &str) -> Result<bool, AuthError> {
    bcrypt::verify(password, hash).map_err(|_| AuthError::HashError)
}

/// Validate password strength
/// - At least 8 characters
/// - Contains at least one number or special character
pub fn validate_password_strength(password: &str) -> Result<(), AuthError> {
    if password.len() < 8 {
        return Err(AuthError::WeakPassword);
    }

    let has_number_or_special = password.chars().any(|c| !c.is_alphabetic());
    if !has_number_or_special {
        return Err(AuthError::WeakPassword);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password123";
        let hash = hash_password(password).unwrap();

        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_password_validation() {
        assert!(validate_password_strength("password123").is_ok());
        assert!(validate_password_strength("short").is_err());
        assert!(validate_password_strength("nodigits").is_err());
    }
}
