# OpenTier Intelligence Engine & Workers

Python gRPC cognition service and autonomous background stream consumers — chat orchestration, multi-model LLM routing, Qdrant hybrid retrieval (dense + sparse BM25), asynchronous data ingestion, and credit metering. Accessible internally from the Rust API gateway and Redis Streams.

## Overview

The intelligence layer handles all reasoning, vector retrieval, and background ML workloads:

- **Chat & Memory** — Conversation orchestration, query rewriting, persistent context, and token streaming
- **Qdrant Hybrid Retrieval** — System of record for vector embeddings. Combines dense embeddings (up to 3072d with Gemini / OpenAI) and sparse BM25 lexical token indices using Reciprocal Rank Fusion (RRF) with tenant isolation
- **Redis Event Backbone** — AOF-persisted streams (`opentier:events:*`), consumer groups, manual XACK, idle-reclaim janitors, and Dead-Letter Queue (DLQ) support
- **Autonomous Workers (`worker.py`)** — Decoupled stream consumers processing web scraping, document chunking, embedding generation, and billing ledger accounting
- **Multi-Model LLM Routing** — Google Gemini (2.5 Flash, 3.5 Pro), OpenAI (GPT-4o, o3-mini), and local Ollama models with AES-256 decrypted runtime keys

## Runtimes

The intelligence codebase powers two distinct containerized runtimes:

1. **gRPC Server (`main.py`)**: Listens on port `50051`. Handles synchronous and streaming RPCs from the Rust API Gateway (`ChatService`, `ResourceService`, `HealthService`).
2. **Background Worker (`worker.py`)**: Runs consumer groups on Redis Streams. Scales and recovers independently from the gRPC server. Roles include:
   - `ingestion`: Consumes `opentier:events:knowledge`, scrapes sources, chunks text, generates embeddings, and indexes into Qdrant & PostgreSQL.
   - `metering`: Consumes `opentier:events:chat`, calculates model token usage, and applies atomic debit transactions to the credit ledger.
   - `memory`: Consumes `opentier:events:chat`, extracts long-term user preferences in the background without affecting chat latency.
   - `heartbeat`: Liveness and monitoring heartbeats.

## Setup

```bash
cp .env.example .env    # Configure LLM providers, Qdrant, and Redis
```

When running via Docker Compose (recommended), `DATABASE_URL`, `REDIS_URL`, `QDRANT_URL`, and `ENCRYPTION_MASTER_KEY` are injected automatically. See the [Docker deployment guide](https://celestial-0.github.io/OpenTier/deployment/docker).

> **Note on Docker Builds (GPU vs CPU)**: By default, the Docker image builds with the PyTorch CUDA runtime. For CPU-only deployments (like AWS), set `INTELLIGENCE_BASE_IMAGE=debian:bookworm-slim` and `INTELLIGENCE_UV_ARGS="--extra cpu"` in the root `server/.env` file.

## Development

```bash
uv sync                                    # Install dependencies
uv run python main.py                      # Start gRPC server on port 50051
uv run python worker.py                    # Start background stream consumers
uv run pytest                              # Run test suite
uv run python scripts/generate_protos.py   # Compile proto definitions
```

## Operational Scripts (`scripts/`)

- `generate_protos.py`: Compiles `intelligence.proto` and patches gRPC stubs.
- `dlq.py`: Dead-letter queue CLI (`list`, `replay`, `purge`) for failed Redis Stream events.
- `backfill_qdrant.py`: Resumable batch backfill worker for indexing PostgreSQL chunks into Qdrant.
- `smoke_qdrant.py`: Live smoke test for Qdrant hybrid retrieval (dense + sparse) and tenant isolation.
- `e2e_durable_ingestion.py`: End-to-end verification for Redis Streams ingestion pipeline.
- `e2e_metering.py`: End-to-end test for event-driven credit metering and deduplication.
- `convert_quotas_to_credits.py`: One-time ledger migration utility to convert legacy message quotas to credits.

## Documentation

- [Intelligence Overview](https://celestial-0.github.io/OpenTier/intelligence/overview)
- [Chat Engine](https://celestial-0.github.io/OpenTier/intelligence/engine)
- [LLM Integration](https://celestial-0.github.io/OpenTier/intelligence/llm)
- [Retrieval & RAG](https://celestial-0.github.io/OpenTier/intelligence/retrieval)
- [Ingestion Pipeline](https://celestial-0.github.io/OpenTier/intelligence/ingestion)
- [gRPC Server](https://celestial-0.github.io/OpenTier/intelligence/grpc-server)

