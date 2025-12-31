# OpenTier

**OpenTier is a shared knowledge space that curates and organizes high-quality developer resources.**

We're building a better way to discover developer tools, credits, and knowledge:
- **Clarity over noise** — Structured, searchable, community-driven instead of random link dumps
- **Trustworthy discovery** — Make good tools, credits, and knowledge easy to find and verify
- **Lower learning costs** — Help developers spend less time searching, more time building

OpenTier combines human curation with intelligent organization to create a reliable, searchable knowledge commons for the developer community.

---

## 🏛️ Architecture Philosophy

To achieve this at scale with high quality, OpenTier separates *control* from *cognition*:
- **Control** (Rust) handles public API, authentication, rate limiting, streaming
- **Cognition** (Python) handles indexing, search, curation logic, RAG, LLM inference  
- **gRPC** is the only bridge between layers

This intentional separation prevents accidental coupling, protects the intelligence layer, and enables independent evolution.

---

## 🏗️ Architecture

```
Client (Web / Mobile / SDK) 
        ↓
    Rust Gateway (Axum)
    - Auth & Identity
    - Rate Limiting
    - Chat Streaming
        ↓ (gRPC)
    Python Engine
    - Chat Orchestration
    - Ingestion Pipelines
    - RAG & Embeddings
        ↓
    PostgreSQL + pgvector
    - Metadata & State
    - Embeddings
```

---

## 🚀 Features

- **Authentication**: Email/password, OAuth (GitHub, Google), session management
- **Chat**: Real-time streaming, RAG support, conversation history
- **Admin**: User management, resource ingestion, system statistics
- **Security**: Tiered rate limiting, CORS, request logging, backpressure handling

---

## 📦 Technology Stack

| Component | Technology |
|-----------|-----------|
| API Gateway | Rust (Axum) |
| Intelligence | Python 3.11+ |
| Database | PostgreSQL 15+ |
| Vectors | pgvector |
| RPC | gRPC (tonic) |
| Streaming | Server-Sent Events |

---

## 📂 Project Structure

```
server/
├── api/                    # Rust API Gateway
│   ├── src/
│   │   ├── auth/          # Authentication
│   │   ├── chat/          # Chat endpoints
│   │   ├── admin/         # Admin endpoints
│   │   ├── middleware/    # Auth, rate limit, tracing
│   │   ├── grpc/          # gRPC client bridge
│   │   └── observability/ # Logging & metrics
│   └── migrations/        # Database migrations
│
├── intelligence/          # Python Intelligence Engine
│   ├── engine/
│   │   ├── chat/          # Conversation orchestration
│   │   ├── ingestion/     # Data pipeline
│   │   ├── embedding/     # Vector generation
│   │   ├── query/         # RAG retrieval
│   │   └── cleaning/      # Data normalization
│   └── interfaces/        # gRPC service stubs
│
├── proto/                 # Protobuf Contracts
└── infra/                 # Docker, Compose, K8s
```

---

## 🔗 Documentation

- **[Architecture](server/README.md)** — Detailed design principles
- **[API Reference](server/api/README.md)** — Complete endpoint documentation
- **[Intelligence Engine](server/intelligence/README.md)** — Chat and RAG pipeline

---

## ⚡ Quick Start

### Prerequisites
- Rust 1.70+, Python 3.11+, PostgreSQL 15+

### Setup

```bash
# Clone and setup Rust gateway
cd server/api
cargo build --release
cargo run --release

# Setup Python engine (in another terminal)
cd server/intelligence
uv sync
uv run main.py

# Initialize database
sqlx migrate run

# Verify health
curl http://localhost:3000/health/api
curl http://localhost:3000/health/intelligence
```

### Docker
```bash
cd server/infra
docker-compose up -d
```

---

## 📄 License

MIT License

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Celestial-0/OpenTier/issues)
- **Docs**: [Architecture](server/README.md)

