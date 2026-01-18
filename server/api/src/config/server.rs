use std::net::{SocketAddr, ToSocketAddrs};
use tokio::net::TcpListener;

/// Create a SocketAddr from host and port
/// Supports both IP addresses (127.0.0.1) and hostnames (localhost)
pub fn addr(host: &str, port: u16) -> SocketAddr {
    let addr_str = format!("{}:{}", host, port);

    // Try to parse as SocketAddr first (for IP addresses)
    if let Ok(addr) = addr_str.parse::<SocketAddr>() {
        return addr;
    }

    // If that fails, try to resolve as hostname
    addr_str
        .to_socket_addrs()
        .expect("Failed to resolve server address")
        .next()
        .expect("No addresses found for hostname")
}

pub async fn listener(addr: SocketAddr) -> TcpListener {
    TcpListener::bind(addr)
        .await
        .expect("Failed to bind TCP listener")
}
