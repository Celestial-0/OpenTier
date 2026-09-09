//! Client-IP resolution behind a trusted-proxy gate.
//!
//! Forwarded headers are honored ONLY when the direct peer is a configured
//! trusted proxy; otherwise the socket address is authoritative. Header
//! spoofing can therefore never mint fresh budgets or evade throttles.

use std::net::IpAddr;

use axum::http::HeaderMap;
use ipnetwork::IpNetwork;

/// Resolve the effective client IP for budgeting/throttling decisions.
pub fn resolve(peer: IpAddr, headers: &HeaderMap, trusted_cidrs: &[IpNetwork]) -> String {
    let peer_trusted = trusted_cidrs.iter().any(|c| c.contains(peer));
    if !peer_trusted {
        return peer.to_string();
    }

    headers
        .get("cf-connecting-ip")
        .and_then(|v| v.to_str().ok())
        .map(str::to_string)
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(str::to_string)
        })
        .or_else(|| {
            headers
                .get("x-forwarded-for")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.split(',').next())
                .map(|v| v.trim().to_string())
        })
        .unwrap_or_else(|| peer.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hdr(pairs: &[(&str, &str)]) -> HeaderMap {
        let mut m = HeaderMap::new();
        for (k, v) in pairs {
            m.insert(
                k.parse::<axum::http::HeaderName>().unwrap(),
                v.parse().unwrap(),
            );
        }
        m
    }

    #[test]
    fn untrusted_peer_cannot_spoof() {
        let cidrs = vec!["10.0.0.0/8".parse::<IpNetwork>().unwrap()];
        let peer: IpAddr = "203.0.113.9".parse().unwrap();
        let headers = hdr(&[("cf-connecting-ip", "1.2.3.4")]);
        assert_eq!(resolve(peer, &headers, &cidrs), "203.0.113.9");
    }

    #[test]
    fn trusted_proxy_forwarded_header_honored() {
        let cidrs = vec!["10.0.0.0/8".parse::<IpNetwork>().unwrap()];
        let peer: IpAddr = "10.1.2.3".parse().unwrap();
        let headers = hdr(&[("cf-connecting-ip", "1.2.3.4")]);
        assert_eq!(resolve(peer, &headers, &cidrs), "1.2.3.4");
    }

    #[test]
    fn trusted_proxy_without_headers_falls_back_to_peer() {
        let cidrs = vec!["10.0.0.0/8".parse::<IpNetwork>().unwrap()];
        let peer: IpAddr = "10.1.2.3".parse().unwrap();
        assert_eq!(resolve(peer, &hdr(&[]), &cidrs), "10.1.2.3");
    }
}
