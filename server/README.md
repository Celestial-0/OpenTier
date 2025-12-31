# OpenTier Server Architecture

**OpenTier** is an MVP‑scale, production‑oriented intelligence platform built around a *deliberate, hard boundary* between **system control** and **system cognition**.

The guiding idea is simple and intentional:

* **Rust** owns the *public gateway*: authentication, authorization, rate limits, streaming, and flow control
* **Python** owns *all intelligence*: chat logic, ingestion, data cleaning, retrieval, RAG, and ML/LLM inference
* **gRPC** is the **only** permitted communication bridge between these layers

This design favors **predictable performance, operational safety, and long‑term evolvability**, while avoiding premature abstraction or accidental complexity.

---

## 1. Architecture Summary

OpenTier follows a **two‑layer, contract‑driven architecture** with a single, explicit trust boundary.

```
Client (Web / Mobile / SDK)
        |
        v
┌─────────────────────────┐
│   Rust API Gateway      │
│─────────────────────────│
│ Auth & Identity         │
│ Rate Limiting & Quotas  │
│ Chat Streaming          │
│ API Validation          │
│ Backpressure & Timeouts │
└───────────┬─────────────┘
            │
            │ gRPC (Streaming)
            │
┌───────────▼─────────────┐
│ Python Intelligence     │
│─────────────────────────│
│ Chat Orchestration      │
│ Ingestion Pipelines     │
│ Data Cleaning           │
│ Retrieval & RAG         │
│ ML / LLM Inference      │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│ Postgres + Vector DB    │
│─────────────────────────│
│ Metadata & State        │
│ Embeddings (pgvector)   │
└─────────────────────────┘
```

The Rust layer is intentionally **non‑intelligent**. The Python layer is intentionally **non‑public**.

---

## 2. Core Design Principles

### 2.1 Hard Separation of Responsibility

Each layer has a narrow, enforceable role:

* Rust **never** performs reasoning, ML, embedding, or data transformation
* Python **never** handles authentication, quotas, or public HTTP/WebSocket APIs
* gRPC is the **only** allowed interaction surface between them

This prevents accidental coupling, protects the intelligence layer from abuse, and allows independent evolution.

---

### 2.2 Contracts Over Conventions

All inter‑layer communication is defined via **versioned Protobuf contracts**.

* Rust owns, versions, and publishes `.proto` definitions
* Python implements contracts strictly, without extension
* Breaking changes are explicit and versioned
* No ad‑hoc fields, implicit behavior, or shared assumptions

Contracts are treated as **infrastructure**, not implementation details.

---

## 3. Technology Stack (MVP)

### 3.1 API Gateway — Rust

**Purpose**: Secure, fast, and deterministic system boundary

* **Language**: Rust
* **Framework**: Axum (or Actix‑Web)
* **RPC**: gRPC (tonic)
* **Streaming**: Server‑Sent Events (SSE), WebSockets, or gRPC streaming

**Responsibilities**:

* Authentication & authorization
* Rate limiting & quota enforcement
* Chat stream lifecycle management
* Request validation and shaping
* Backpressure, timeouts, and retries
* Metrics, tracing, and observability

The Rust layer does **not** contain business logic and does **not** write to the database.

---

### 3.2 Intelligence Engine — Python

**Purpose**: All reasoning, intelligence, and ML‑driven behavior

* **Language**: Python 3.11+
* **Runtime**: asyncio with uvloop

**Responsibilities**:

* Chat orchestration and conversation state
* Data ingestion (batch and streaming)
* Data cleaning, normalization, and enrichment
* Embedding generation
* Vector search and retrieval
* Retrieval‑Augmented Generation (RAG)
* ML / LLM inference and ranking

The intelligence engine is isolated from public traffic and reachable **only** via gRPC from the Rust gateway.

---

### 3.3 Data Layer

#### Relational Store

* **Database**: PostgreSQL 15+
* **ORM**: SQLAlchemy 2.0

Used for:

* Users, tenants, and metadata
* Conversation state and history
* Audit logs and system records

#### Vector Store

* **Engine**: pgvector (Postgres extension)

Used for:

* Embedding storage
* Semantic similarity search
* Context retrieval for RAG

A single Postgres‑based store keeps the MVP operationally simple while remaining extensible.

---

## 4. Communication Model

### Why gRPC

* Binary protocol with low serialization overhead
* Strong, explicit schemas via Protobuf
* Native support for streaming responses
* Excellent Rust ecosystem support

gRPC acts as a **contractual firewall**, not merely a transport mechanism.

---

### Chat Streaming Flow

```
Client
  ↓
Rust API Gateway
  - Authentication verified
  - Quotas enforced
  - Streaming session opened
  ↓ gRPC (bidirectional stream)
Python Intelligence Engine
  - Retrieve context (RAG)
  - Generate response tokens
  - Stream chunks incrementally
  ↓
Rust forwards chunks → Client
```

Rust streams **flow and safety**. Python streams **meaning and intent**.

---

## 5. Repository Structure

```
server/
│
├── api/                          # Rust — public API boundary
│   ├── src/
│   │   ├── main.rs
│   │   ├── admin/                # Admin operations
│   │   ├── auth/                 # Authentication & authorization
│   │   ├── chat/                 # Chat endpoints
│   │   ├── common/               # Shared utilities
│   │   ├── config/               # Runtime configuration
│   │   ├── email/                # Email services
│   │   ├── gateway/              # External‑facing API (REST / SSE / WS)
│   │   ├── grpc/                 # gRPC client & streaming bridge
│   │   ├── middleware/           # Rate limits, guards, tracing
│   │   ├── observability/        # Logs, metrics, tracing
│   │   └── user/                 # User management
│   ├── migrations/               # SQLx migrations
│   ├── build.rs                  # Build script
│   ├── Cargo.toml
│   ├── .env                      # Local environment (not committed)
│   ├── .env.example              # Environment template
│   ├── .gitignore
│   └── .sqlx/                    # SQLx query cache
│
├── intelligence/                 # Python — non‑public intelligence engine
│   ├── core/                     # Config, logging, lifecycle, database
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── lifecycle.py
│   │   ├── logging.py
│   │   └── database/
│   ├── engine/                   # All intelligence logic
│   │   ├── __init__.py
│   │   ├── chat/
│   │   ├── embedding/
│   │   ├── ingestion/
│   │   └── query/
│   ├── interfaces/               # gRPC service implementations (thin)
│   │   ├── __init__.py
│   │   ├── chat.py
│   │   ├── health.py
│   │   └── resource.py
│   ├── generated/                # Generated gRPC code
│   │   ├── __init__.py
│   │   ├── intelligence_pb2.py
│   │   ├── intelligence_pb2.pyi
│   │   └── intelligence_pb2_grpc.py
│   ├── migrations/               # Alembic/SQL migrations
│   ├── script/                   # Utility scripts
│   │   └── migrate.py
│   ├── test/                     # Test suite
│   ├── main.py                   # gRPC server bootstrap
│   ├── pyproject.toml
│   ├── pytest.ini
│   ├── .env                      # Local environment (not committed)
│   ├── .env.example              # Environment template
│   ├── .gitignore
│   ├── .python-version           # Python version specification
│   └── README.md
│
├── proto/                        # Contract boundary (owned by API layer)
│   └── intelligence.proto        # Protobuf service definitions
│
├── infra/                        # Docker, deployment, infrastructure
│
├── api.md                        # API documentation
├── intelligence.md               # Intelligence engine documentation
└── README.md
```

---

## 6. MVP Scope

### Included

* Authenticated Rust API gateway
* Streaming chat responses
* gRPC‑based intelligence invocation
* Ingestion and data‑cleaning pipelines
* Embedding generation and storage
* Vector similarity search
* RAG‑backed conversational responses

### Explicitly Out of Scope

* Multi‑region deployments
* Automatic ML autoscaling
* Advanced agent frameworks
* Dedicated external vector databases

The MVP prioritizes **correctness, clarity, and observability** over raw scale.

---

## 7. Development Workflow

1. Define or evolve gRPC `.proto` contracts
2. Implement Rust gateway logic
3. Implement Python intelligence behavior
4. Validate streaming and backpressure behavior
5. Measure latency, throughput, and cost

No feature ships without a stable, versioned contract.

---

## 8. Post‑MVP Evolution

This architecture supports clean, incremental growth:

* Replace pgvector with Qdrant or Milvus
* Introduce async messaging (NATS) for ingestion pipelines
* Move selective inference closer to Rust (WASM / FFI)
* Add Redis for hot‑path caching and deduplication

None of these changes require public API rewrites.

---

## 9. Summary

OpenTier’s MVP is intentionally disciplined:

* Rust protects the system boundary and enforces policy
* Python owns intelligence end‑to‑end
* gRPC enforces contracts and streaming semantics
* Postgres acts as durable system memory

The result is a system that is **easy to reason about today** and **safe to scale tomorrow**.

OpenTier is small enough to ship quickly—and structured enough to survive growth without architectural regret.
