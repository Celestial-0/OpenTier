# OpenTier Server

Backend infrastructure for the OpenTier platform — database, API gateway, and intelligence engine, orchestrated via Docker Compose.

## Architecture

```
Client → Rust API Gateway → gRPC → Python Intelligence Engine → PostgreSQL + pgvector
```

- **Rust** handles auth, rate limiting, streaming, and all public HTTP traffic
- **Python** handles chat orchestration, RAG, ingestion, and LLM inference
- **gRPC** is the only permitted bridge between layers

## Quick Start

```bash
# Configure environment
cp api/.env.example api/.env
cp intelligence/.env.example intelligence/.env
echo "POSTGRES_USER=opentier\nPOSTGRES_PASSWORD=changeme\nPOSTGRES_DB=opentier" > .env

# Start everything
docker compose up
```

The API will be available at `http://localhost:4000`.

## Structure

```
server/
├── docker-compose.yml    # Full stack orchestration
├── api/                  # Rust/Axum API gateway
├── intelligence/         # Python gRPC intelligence engine
├── db/migrations/        # Unified SQL migrations (golang-migrate)
└── proto/                # Shared Protobuf contract
```

## Documentation

- [Architecture Overview](https://celestial-0.github.io/OpenTier/architecture/overview)
- [API Reference](https://celestial-0.github.io/OpenTier/api/overview)
- [Intelligence Engine](https://celestial-0.github.io/OpenTier/intelligence/overview)
- [Docker Deployment](https://celestial-0.github.io/OpenTier/deployment/docker)
- [Security Model](https://celestial-0.github.io/OpenTier/security/overview)
