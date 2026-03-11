# <img src="assets/logo.svg" alt="OpenTier Logo" width="45" align="top" /> OpenTier

**The high-performance foundation for scalable AI knowledge infrastructure.**

OpenTier is a production-grade AI platform designed for developers and businesses to orchestrate intelligent data curation, RAG-driven retrieval, and automated information processing at scale. Built with a focus on architectural clarity, performance, and security.

<a href="https://github.com/Celestial-0/OpenTier/blob/main/assets/OpenTier%20Demo%20Compressed.mp4?raw=true">
  <img src="https://github.com/Celestial-0/OpenTier/blob/main/assets/opentier-demo.gif" width="100%">
</a>

> **Rust owns the public gateway. Python owns all intelligence. gRPC is the only permitted bridge.**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Zustand |
| API Gateway | Rust / Axum, Tokio, SQLx |
| Intelligence | Python 3.14, gRPC, SQLAlchemy 2.0 |
| Database | PostgreSQL 16 + pgvector |
| IPC | gRPC over HTTP/2, Protobuf v3 |

## Quick Start

```bash
# 1. Configure environment
cp server/api/.env.example server/api/.env
cp server/intelligence/.env.example server/intelligence/.env
cat > server/.env << 'EOF'
POSTGRES_USER=opentier
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=opentier

# Optional: Intelligence service build arguments (for CPU-only deployments like AWS)
# INTELLIGENCE_BASE_IMAGE=debian:bookworm-slim
# INTELLIGENCE_UV_ARGS="--extra cpu"
EOF


# 2. Start the server stack
cd server && docker compose up

# 3. Start the client (in another terminal)
cd client && bun install && bun run dev
```

API available at `http://localhost:4000` · Client with turborepo having web app at `http://localhost:3001` and docs at `http://localhost:3002`

## Repository Structure

```
OpenTier/
├── client/
│   ├── web/            # Next.js 16 application
│   └── docs/           # Documentation site (MDX)
└── server/
    ├── api/            # Rust/Axum API gateway
    ├── intelligence/   # Python gRPC intelligence engine
    ├── db/migrations/  # Unified SQL migrations (sqlx)
    └── proto/          # Shared Protobuf contract
```

## Documentation

Full architecture documentation, API reference, and deployment guides:

**[Documentation](https://celestial-0.github.io/OpenTier/)**

## License

MIT License

## Links

- [Documentation](https://celestial-0.github.io/OpenTier/)
- [Issues](https://github.com/Celestial-0/OpenTier/issues)
