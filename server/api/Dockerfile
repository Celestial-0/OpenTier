# syntax=docker/dockerfile:1

# ── Stage 1: Builder ──────────────────────────────────────────────────
FROM rust:slim-bookworm AS builder

# Install build dependencies required for compiling protobuf and SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy proto definitions, database migrations (for compile-time embedding), and api source
COPY proto/ ./proto/
COPY db/ ./db/
COPY api/ ./api/

WORKDIR /workspace/api

# Enable offline mode for SQLx compile-time query verification using .sqlx cache
ENV SQLX_OFFLINE=true

# Build release binary (migrations are embedded via sqlx::migrate!) and strip debug symbols
RUN cargo build --release --bin api && \
    strip target/release/api

# ── Stage 2: Production Runner ────────────────────────────────────────
FROM debian:bookworm-slim AS runner

# Install runtime dependencies: SSL root certificates, OpenSSL library, and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated unprivileged user and group (UID 10001)
RUN groupadd -g 10001 opentier && \
    useradd -u 10001 -g opentier -s /bin/bash -m opentier

WORKDIR /app

# Copy compiled binary and public assets
COPY --from=builder /workspace/api/target/release/api /app/api
COPY --from=builder /workspace/api/public /app/public

# Set ownership to unprivileged user
RUN chown -R opentier:opentier /app

# Run as non-root user
USER opentier:opentier

# Default internal port
EXPOSE 4000

ENV SERVER_HOST=0.0.0.0 \
    SERVER_PORT=4000 \
    RUST_LOG=api=info,tower_http=info

# Healthcheck checking API health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health/api || exit 1

CMD ["/app/api"]
