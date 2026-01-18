fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Configure tonic-prost-build for client-only proto compilation
    tonic_prost_build::configure()
        .build_server(false) // We're a client, not implementing the gRPC server
        .compile_protos(&["../proto/intelligence.proto"], &["../proto"])?;

    Ok(())
}
