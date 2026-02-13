use rand::{Rng, distributions::Alphanumeric};

/// Generate a secure random token
/// Returns a 32-character alphanumeric string
pub fn generate_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect()
}

/// Generate a secure session token
/// Returns a 64-character alphanumeric string for extra security
pub fn generate_session_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(64)
        .map(char::from)
        .collect()
}

/// Generate a 6-digit numeric OTP
pub fn generate_otp() -> String {
    let otp: u32 = rand::thread_rng().gen_range(0..1000000);
    format!("{:06}", otp)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_generation() {
        let token1 = generate_token();
        let token2 = generate_token();

        assert_eq!(token1.len(), 32);
        assert_eq!(token2.len(), 32);
        assert_ne!(token1, token2); // Should be different
        assert!(token1.chars().all(|c| c.is_alphanumeric()));
    }

    #[test]
    fn test_session_token_generation() {
        let token = generate_session_token();
        assert_eq!(token.len(), 64);
        assert!(token.chars().all(|c| c.is_alphanumeric()));
    }
}
