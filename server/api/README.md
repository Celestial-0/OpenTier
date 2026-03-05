# OpenTier API Gateway

Rust/Axum HTTP gateway — authentication, rate limiting, streaming, and gRPC bridge to the Intelligence Engine.

## Overview

The API gateway is the sole public-facing entry point. It handles:

- **Auth** — Email/password, OAuth (GitHub, Google), session management
- **Rate Limiting** — Tiered per-endpoint throttling (Governor)
- **Chat Streaming** — SSE bridge from gRPC server-streaming
- **Contact** — Public contact form with email delivery
- **Admin** — User management, resource ingestion, RBAC

## Setup

```bash
cp .env.example .env    # Configure environment variables
```

When running via Docker Compose (recommended), `DATABASE_URL`, `SERVER_HOST`, and `INTELLIGENCE_SERVICE_URL` are injected automatically. See the [Docker deployment guide](https://celestial-0.github.io/OpenTier/deployment/docker).

## Development

```bash
cargo build             # Build
cargo run               # Run (requires PostgreSQL + .env)
cargo test              # Run tests
cargo sqlx prepare      # Update offline query cache
```

## Documentation

- [API Overview & Module Map](https://celestial-0.github.io/OpenTier/api/overview)
- [Route Map](https://celestial-0.github.io/OpenTier/api/routes)
- [Middleware Pipeline](https://celestial-0.github.io/OpenTier/api/middleware)
- [Auth & Session Model](https://celestial-0.github.io/OpenTier/api/auth)
- [Chat Handlers](https://celestial-0.github.io/OpenTier/api/chat)
- [Contact Endpoint](https://celestial-0.github.io/OpenTier/api/contact)
- [Admin & RBAC](https://celestial-0.github.io/OpenTier/api/admin)
