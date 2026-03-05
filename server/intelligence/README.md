# OpenTier Intelligence Engine

Python gRPC service — chat orchestration, RAG, data ingestion, and LLM inference. Accessible only from the Rust API gateway.

## Overview

The intelligence engine handles all reasoning and ML workloads:

- **Chat** — Conversation orchestration, context tracking, response generation
- **Retrieval** — Semantic search via pgvector, RAG pipeline
- **Ingestion** — Web scraping, document processing, chunking, embedding
- **LLM** — Multi-provider inference (OpenAI, Google GenAI, Ollama)

## Setup

```bash
cp .env.example .env    # Configure LLM provider and credentials
```

When running via Docker Compose (recommended), `DB_URL` is injected automatically. See the [Docker deployment guide](https://celestial-0.github.io/OpenTier/deployment/docker).

## Development

```bash
uv sync                 # Install dependencies
uv run python main.py   # Start gRPC server on port 50051
uv run pytest           # Run tests
```

## Documentation

- [Intelligence Overview](https://celestial-0.github.io/OpenTier/intelligence/overview)
- [Chat Engine](https://celestial-0.github.io/OpenTier/intelligence/engine)
- [LLM Integration](https://celestial-0.github.io/OpenTier/intelligence/llm)
- [Retrieval & RAG](https://celestial-0.github.io/OpenTier/intelligence/retrieval)
- [Ingestion Pipeline](https://celestial-0.github.io/OpenTier/intelligence/ingestion)
- [gRPC Server](https://celestial-0.github.io/OpenTier/intelligence/grpc-server)
