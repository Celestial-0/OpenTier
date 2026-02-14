# Intelligence Engine

**Private intelligence layer for OpenTier** — responsible for all reasoning, data processing, and ML/LLM inference.

This gRPC service is not public-facing. It's accessible only from the Rust API Gateway via gRPC.

---

## 🎯 Responsibilities

- **Chat Orchestration** — Conversation management, response generation, context tracking
- **Data Ingestion** — Web scraping, document processing, content extraction
- **Data Cleaning** — Normalization, deduplication, validation
- **Embeddings** — Vector generation and storage (pgvector)
- **Retrieval** — Semantic search and RAG (Retrieval-Augmented Generation)
- **LLM Inference** — Integration with LLM providers

---

## 📂 Architecture

```
intelligence/
├── core/                      # Core utilities & configuration
│   ├── config.py              # Environment and settings
│   ├── lifecycle.py           # Service startup/shutdown
│   ├── logging.py             # Structured logging
│   └── database/
│       ├── models.py          # SQLAlchemy ORM models
│       └── session.py         # Database session management
│
├── engine/                    # Intelligence logic
│   ├── chat/
│   │   ├── service.py         # Chat orchestration
│   │   └── storage.py         # Conversation persistence
│   ├── embedding/
│   │   ├── models.py          # Embedding model interfaces
│   │   ├── batch.py           # Batch embedding generation
│   │   └── storage.py         # Vector store operations
│   ├── ingestion/
│   │   ├── processor.py       # Main ingestion pipeline
│   │   ├── crawler.py         # Web scraper
│   │   ├── chunker.py         # Text chunking strategies
│   │   ├── retry.py           # Retry logic
│   │   ├── validation.py      # Data validation
│   │   ├── storage.py         # Document storage
│   │   └── cleaning/          # Data cleaning utilities
│   └── query/
│       ├── pipeline.py        # RAG query pipeline
│       ├── llm/               # LLM inference
│       └── retrieval/         # Semantic search
│
├── interfaces/                # gRPC service implementations
│   ├── chat.py                # Chat service
│   ├── health.py              # Health check service
│   └── resource.py            # Resource ingestion service
│
├── generated/                 # Protobuf generated code
│   ├── intelligence_pb2.py    # Protocol buffer definitions
│   └── intelligence_pb2_grpc.py  # gRPC service stubs
│
├── migrations/                # Database migrations
│   └── *.sql                  # SQL migration files
│
├── script/
│   └── migrate.py             # Migration runner
│
├── test/                      # Test suite
│   ├── test_chat.py
│   ├── test_health.py
│   ├── test_resource.py
│   └── conftest.py            # Pytest fixtures
│
├── main.py                    # Service entry point
├── pyproject.toml             # Python dependencies (uv)
├── pytest.ini                 # Pytest configuration
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 15+ with pgvector extension
- uv (Python package manager)

### Installation

```bash
# Install dependencies
uv sync

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

### Configuration

Create `.env` in the intelligence root:

```env
# Server
HOST=0.0.0.0
PORT=50051

# Database
DATABASE_URL=postgresql://user:password@localhost/opentier_intelligence
PGVECTOR_ENABLED=true

# LLM
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500

# Embeddings
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# Logging
LOG_LEVEL=INFO
```

### Running the Service

```bash
# Using uv
uv run python main.py

# Or with direct Python
python main.py
```

The service will start on `http://0.0.0.0:50051` (gRPC).

---

## 🧪 Testing

```bash
# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest test/test_chat.py

# Run with coverage
uv run pytest --cov=engine
```

---

## 🔄 Database Migrations

Migrations are version-controlled in `migrations/`.

Run migrations:
```bash
uv run python script/migrate.py
```

---

## 📚 Key Modules

### `core/`
Environment configuration, logging setup, and database session management. Everything needed for service lifecycle.

### `engine/chat/`
Conversation state management and response generation. Interfaces with the LLM provider and stores message history.

### `engine/embedding/`
Vector generation and storage operations. Manages embedding models and pgvector interactions.

### `engine/ingestion/`
Multi-source document ingestion pipeline:
- Web crawling and scraping
- Document parsing and extraction
- Text chunking and normalization
- Data cleaning and deduplication
- Batch embedding generation

### `engine/query/`
RAG (Retrieval-Augmented Generation) pipeline:
- Semantic search over stored embeddings
- Context retrieval for LLM
- Query rewriting and ranking

### `interfaces/`
gRPC service implementations. Thin adapters between gRPC contracts and engine logic.

---

## 🔗 gRPC Services

### Chat Service
Stream-based conversation interface. Handles bidirectional streaming of chat messages and responses.

### Health Service
Health check endpoint for readiness probes.

### Resource Service
Document and resource ingestion interface. Accepts URLs, text, or files for processing.

---

## 📊 Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Python 3.11+ |
| Async | asyncio + uvloop |
| Database | PostgreSQL + SQLAlchemy 2.0 |
| Vectors | pgvector |
| gRPC | grpcio, protobuf |
| Package Manager | uv |
| Testing | pytest |

---

## 🤝 Development

### Code Style

- Use `black` for formatting
- Use `ruff` for linting
- Type hints required for new code

```bash
# Format code
uv run black .

# Lint code
uv run ruff check .
```

### Updating Protobufs
245: 
246: If you modify `server/proto/intelligence.proto`, you must regenerate the Python code:
247: 
248: ```bash
249: uv run python script/generate_protos.py
250: ```
251: 
252: ### Adding Dependencies

```bash
# Add a new dependency (with uv)
uv add package_name

# Update lock file
uv sync
```

---

## 📝 Notes

- This service is **intentionally non-public** — only the Rust gateway communicates with it
- All inter-layer communication is via **versioned gRPC contracts**
- Database transactions ensure consistency for critical operations
- Logging is structured and includes request tracing for observability

---

## 🏆 Status

**Current Version**: v0.1.0 (MVP)  
**Stability**: Pre-release
