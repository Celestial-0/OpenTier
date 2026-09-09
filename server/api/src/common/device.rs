//! Device and User-Agent parsing powered by the `woothee` crate.

use woothee::parser::Parser;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceInfo {
    /// Human-readable device description, e.g. "Chrome on Windows 10", "Safari on iOS"
    pub name: String,
    /// Canonical category: "desktop", "mobile", "smart_device", "bot", or "unknown"
    pub category: String,
    /// Detected browser name, e.g. "Chrome", "Firefox", "Safari"
    pub browser: Option<String>,
    /// Detected OS name and version, e.g. "Windows 10", "Mac OSX", "iOS"
    pub os: Option<String>,
}

/// Parse a raw User-Agent header into structured `DeviceInfo` using Woothee.
pub fn parse_user_agent(ua_str: Option<&str>) -> DeviceInfo {
    let Some(ua) = ua_str else {
        return DeviceInfo {
            name: "Unknown Device".to_string(),
            category: "unknown".to_string(),
            browser: None,
            os: None,
        };
    };

    let trimmed = ua.trim();
    if trimmed.is_empty() {
        return DeviceInfo {
            name: "Unknown Device".to_string(),
            category: "unknown".to_string(),
            browser: None,
            os: None,
        };
    }

    let parser = Parser::new();
    match parser.parse(trimmed) {
        Some(res) => {
            let browser = if res.name != "UNKNOWN" {
                Some(res.name.to_string())
            } else {
                None
            };

            let os = if res.os != "UNKNOWN" {
                if !res.os_version.is_empty() && res.os_version != "UNKNOWN" {
                    Some(format!("{} {}", res.os, res.os_version))
                } else {
                    Some(res.os.to_string())
                }
            } else {
                None
            };

            let name = match (&browser, &os) {
                (Some(b), Some(o)) => format!("{b} on {o}"),
                (Some(b), None) => b.clone(),
                (None, Some(o)) => o.clone(),
                (None, None) => "Web Browser".to_string(),
            };

            let category = match res.category {
                "smartphone" | "mobilephone" => "mobile",
                "pc" => "desktop",
                "appliance" => "smart_device",
                "crawler" => "bot",
                _ => "desktop",
            };

            DeviceInfo {
                name,
                category: category.to_string(),
                browser,
                os,
            }
        }
        None => DeviceInfo {
            name: "Web Browser".to_string(),
            category: "desktop".to_string(),
            browser: None,
            os: None,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_chrome_windows() {
        let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
        let info = parse_user_agent(Some(ua));
        assert_eq!(info.category, "desktop");
        assert!(info.name.contains("Chrome"));
        assert!(info.name.contains("Windows"));
    }

    #[test]
    fn parses_iphone_safari() {
        let ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        let info = parse_user_agent(Some(ua));
        assert_eq!(info.category, "mobile");
        assert!(info.name.contains("Safari"));
        assert!(info.name.contains("iPhone") || info.name.contains("iOS"));
    }

    #[test]
    fn handles_none() {
        let info = parse_user_agent(None);
        assert_eq!(info.name, "Unknown Device");
        assert_eq!(info.category, "unknown");
    }
}
