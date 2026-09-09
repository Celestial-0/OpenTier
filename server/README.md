# OpenTier Server

Backend infrastructure for the OpenTier platform — database, Redis event bus, Qdrant vector engine, API gateway, intelligence engine, and durable background workers orchestrated via Docker Compose.

## Architecture

```
Client → Rust API Gateway ──┬──> gRPC ─────────> Python Intelligence Engine ──┐
                            │                                                 │
                            └──> Redis Streams ─> Background Worker ──────────┼──> PostgreSQL 18
                                                                              ├──> Redis 8 (AOF)
                                                                              └──> Qdrant (Dense+Sparse)
```

- **Rust API Gateway (`api`)**: Handles public HTTP/REST traffic, JWT/OAuth auth, tiered rate limiting, and SSE streaming with sub-millisecond overhead.
- **Python Intelligence (`intelligence`)**: Handles conversational AI, query rewriting, multi-model routing (Google Gemini, OpenAI GPT, Ollama), and hybrid RAG retrieval over gRPC.
- **Autonomous Workers (`worker`)**: Decoupled background consumer processes running `worker.py` for long-running scraping, document chunking, embedding generation, and billing metering.
- **Redis 8 (`redis`)**: High-performance AOF persistent event streaming (`opentier:events:*`), distributed locks, and SHA-256 deduplication.
- **Qdrant (`qdrant`)**: Dedicated vector store of record for hybrid retrieval combining dense neural embeddings (up to 3072d) and sparse BM25 token vectors with server-side RRF fusion.
- **PostgreSQL 18 (`database`)**: Relational ACID system of record for accounts, permissions, audit logs, and knowledge catalog metadata.

## Quick Start

```bash
# Configure environment
cp api/.env.example api/.env
cp intelligence/.env.example intelligence/.env
cp .env.example .env

# Start all 6 services
docker compose up
```

### Core Services

| Container | Image | Port | Description |
|-----------|-------|------|-------------|
| `opentier-api` | `opentier-api:latest` | `4000` | Rust/Axum HTTP Gateway & SSE |
| `opentier-intelligence` | `opentier-intelligence:latest` | `50051` | Python gRPC Cognition Service |
| `opentier-worker` | `opentier-intelligence:latest` | None | Python Background Stream Consumer |
| `opentier-qdrant` | `qdrant/qdrant:latest` | `6333`, `6334` | Hybrid Vector Database (Dense + Sparse) |
| `opentier-redis` | `redis:8-alpine` | `6379` | Persistent Event Bus & Distributed Locks |
| `opentier-database` | `postgres:18` | `5432` | Relational Store of Record |

### Building for CPU / Cloud (AWS, etc.)

By default, the Intelligence engine builds a large image containing full PyTorch CUDA drivers for GPU usage. If you are deploying to a CPU-only environment (e.g., standard AWS EC2 instances) or want to save gigabytes of disk space, configure the root `.env` file first:

```bash
# Inside server/.env
INTELLIGENCE_BASE_IMAGE=debian:bookworm-slim
INTELLIGENCE_UV_ARGS="--extra cpu"
```
Then build using: `docker compose build intelligence worker`.

The API will be available at `http://localhost:4000`.

## Structure

```
server/
├── docker-compose.yml    # Full stack orchestration (6 services)
├── api/                  # Rust/Axum API gateway (with sqlx migrations)
├── intelligence/         # Python gRPC intelligence engine & worker
│   ├── features/         # Chat, knowledge, billing, and auth
│   ├── shared/qdrant/    # Qdrant client adapter (dense + sparse RRF)
│   ├── shared/redis/     # Redis Streams bus, consumers, and dedupe
│   ├── scripts/          # DLQ management, backfill, and smoke tests
│   └── worker.py         # Standalone background consumer runtime
└── proto/                # Shared Protobuf contracts
```

## Documentation

- [Architecture Overview](https://celestial-0.github.io/OpenTier/architecture/overview)
- [API Reference](https://celestial-0.github.io/OpenTier/api/overview)
- [Intelligence Engine](https://celestial-0.github.io/OpenTier/intelligence/overview)
- [Docker Deployment](https://celestial-0.github.io/OpenTier/deployment/docker)
- [Security Model](https://celestial-0.github.io/OpenTier/security/overview)

