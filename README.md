# <img src="assets/logo.svg" alt="OpenTier Logo" width="45" align="top" /> OpenTier [![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/Celestial-0/OpenTier)

**The high-performance foundation for scalable AI knowledge infrastructure.**

OpenTier is a production-grade AI platform designed for developers and businesses to orchestrate intelligent data curation, RAG-driven retrieval, and automated information processing at scale. Built with a focus on architectural clarity, performance, and security.

<a href="https://github.com/Celestial-0/OpenTier/blob/main/assets/OpenTier%20Demo%20Compressed.mp4?raw=true">
  <img src="https://github.com/Celestial-0/OpenTier/blob/main/assets/opentier-demo.gif" width="100%">
</a>

> **Rust owns the public gateway. Python owns all intelligence. Redis Streams orchestrates durable events. Qdrant powers hybrid retrieval.**

## What's New in v1.1.0

- **Qdrant Hybrid Retrieval**: Replaced monolithic vector search with dedicated Qdrant vector database (`knowledge_chunks` collection) combining dense neural vectors (3072d via `text-embedding-3-large`) and sparse BM25 token indices with server-side Reciprocal Rank Fusion (RRF).
- **Redis 8 Streams Event Backbone**: Decoupled asynchronous event pipeline supporting consumer groups, automatic dead-letter queue (DLQ) routing, SHA-256 deduplication, and orphaned job sweeps.
- **Autonomous Background Workers**: Standalone consumer runtime (`worker.py`) executing long-running web scraping, document chunking, credit metering, and memory extraction outside user request cycles.
- **PostgreSQL 18 Transactional Ledger**: Upgraded relational store featuring an append-only `credit_transactions` audit ledger, pre-stream `credit_holds`, dynamic `model_providers` catalog, and `event_outbox`.
- **Sealed Provider Credentials**: Master key encryption (`ENCRYPTION_MASTER_KEY` via AES-256-GCM) ensuring third-party LLM and embedding API keys are sealed at rest in the database and never touch environment files or logs.
- **Multi-Model Intelligence Catalog**: Dynamic database-backed routing across Google Gemini, OpenAI GPT, and local Ollama models with automated fallback chains.

## Architecture Overview

```
                          ┌───────────────────────┐
                          │   Client (Web / SDK)  │
                          └───────────┬───────────┘
                                      │ HTTP / SSE
                                      ▼
                          ┌───────────────────────┐
                          │  Rust API Gateway     │  (Port 4000)
                          │  (Axum / Tokio / SQLx)│
                          └─────┬───────────┬─────┘
                                │           │
                    gRPC (HTTP/2)           │ Redis Streams (XADD)
                                │           │
                                ▼           ▼
     ┌────────────────────────────┐       ┌────────────────────────────┐
     │  Python Intelligence       │       │  Autonomous Workers        │
     │  Engine (gRPC Port 50051)  │       │  (Durable Stream Consumers)│
     └──────────────┬─────────────┘       └──────────────┬─────────────┘
                    │                                    │
                    └─────────────────┬──────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│   PostgreSQL 18    │     │   Redis 8 Streams  │     │  Qdrant Vector DB  │
│  System of Record  │     │  Events, Bus, DLQ  │     │  Hybrid Dense+BM25 │
└────────────────────┘     └────────────────────┘     └────────────────────┘
```

### Key Architectural Pillars

1. **Rust API Gateway (`server/api`)**: Built on Tokio & Axum. Handles public HTTP/REST traffic, OAuth 2.0 authentication, session management, token-bucket rate limiting, and real-time Server-Sent Events (SSE) streaming with minimal memory footprint.
2. **Python Intelligence Engine (`server/intelligence`)**: High-performance gRPC cognition service. Orchestrates conversational memory, query expansion, and multi-provider LLM routing (Google Gemini, OpenAI GPT, and local Ollama) using AES-256 decrypted runtime keys.
3. **Qdrant Vector Database (`opentier-qdrant`)**: Dedicated vector store of record for hybrid retrieval. Fuses high-dimensional dense embeddings (up to 3072d) with sparse BM25 lexical token indices using server-side Reciprocal Rank Fusion (RRF) and strict tenant isolation (`user_id`).
4. **Redis 8 Event Backbone (`opentier-redis`)**: AOF-persisted event streaming backbone (`opentier:events:*`). Implements consumer groups, distributed locking, atomic credit deduplication with SHA-256 keys, automatic idle-claim janitors (`XAUTOCLAIM`), and Dead-Letter Queue (DLQ) tooling.
5. **Autonomous Background Workers (`opentier-worker`)**: Decoupled asynchronous worker processes (`worker.py`). Consumes stream events to execute long-running scraping, document chunking, embedding generation, and billing ledger accounting without blocking API responses.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS, Zustand |
| **API Gateway** | Rust / Axum, Tokio, SQLx, Tower |
| **Cognition Engine** | Python 3.14, gRPC, SQLAlchemy 2.0, Pydantic v2 |
| **Background Workers** | Python asyncio, Redis Streams consumer groups |
| **Vector Database** | Qdrant (Dense + Sparse HNSW & BM25) |
| **Event Bus & Cache** | Redis 8 (AOF, Streams, Distributed Locks) |
| **Relational Database** | PostgreSQL 18 (System of record, SQLx migrations) |
| **IPC & Contracts** | gRPC over HTTP/2, Protobuf v3 |

## Quick Start

### 1. Production Deployment (Pre-Built GHCR Containers)

Deploy the entire 6-service stack in under a minute without cloning the full repository:

```bash
# 1. Download production compose file and environment template
curl -O https://raw.githubusercontent.com/Celestial-0/OpenTier/main/server/docker-compose.yml
curl -O https://raw.githubusercontent.com/Celestial-0/OpenTier/main/server/.env.example
cp .env.example .env

# 2. Configure your environment credentials
# Edit .env with your POSTGRES_PASSWORD and ENCRYPTION_MASTER_KEY (openssl rand -base64 32)

# 3. Pull published GHCR images and launch all services
docker compose up -d
```

> Images are built and published automatically to GitHub Container Registry (GHCR) via [docker-publish.yml](.github/workflows/docker-publish.yml):
> - `ghcr.io/celestial-0/opentier-api:latest` (Rust/Axum Gateway)
> - `ghcr.io/celestial-0/opentier-intelligence:latest` (Python Cognition Engine & Stream Workers)

### 2. Local Development from Source

```bash
git clone https://github.com/Celestial-0/OpenTier.git
cd OpenTier/server

# Build and start services locally with dev overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# In another terminal, start the web client
cd ../client && bun install && bun run dev
```

### Services & Port Mappings

| Service | Container | Port | Scope |
|---------|-----------|------|-------|
| Rust API Gateway | `opentier-api` | `4000` | Public HTTP/REST & SSE |
| Next.js Web App | `client/web` | `3001` (dev) / `3000` (prod) | Public Web Browser |
| Documentation Site | `client/docs` | `3002` | Public MDX Docs |
| Python Intelligence | `opentier-intelligence` | `50051` | Internal gRPC |
| Background Worker | `opentier-worker` | None | Internal Stream Consumer |
| Redis 8 Streams | `opentier-redis` | `6379` | Internal Event Bus |
| Qdrant Vector Store | `opentier-qdrant` | `6333` (REST), `6334` (gRPC) | Internal Vector DB |
| PostgreSQL 18 | `opentier-database` | `5432` | Internal Relational DB |

## Repository Structure

```
OpenTier/
├── client/
│   ├── web/                    # Next.js 16 application (Turborepo)
│   └── docs/                   # Documentation site (MDX)
└── server/
    ├── docker-compose.yml      # Orchestrates all 6 core services
    ├── api/                    # Rust/Axum API gateway (with sqlx migrations)
    ├── intelligence/           # Python gRPC intelligence engine & worker
    │   ├── features/           # Chat, knowledge, billing, and auth
    │   ├── shared/qdrant/      # Qdrant client adapter (dense + sparse RRF)
    │   ├── shared/redis/       # Redis Streams bus, consumers, and dedupe
    │   ├── scripts/            # DLQ management, backfill, and smoke tests
    │   └── worker.py           # Standalone background consumer runtime
    └── proto/                  # Shared Protobuf contracts
```

## Documentation

Full architecture documentation, API reference, and deployment guides:

**[Documentation](https://celestial-0.github.io/OpenTier/)**

## License

MIT License

## Links

- [Documentation](https://celestial-0.github.io/OpenTier/)
- [Issues](https://github.com/Celestial-0/OpenTier/issues)

