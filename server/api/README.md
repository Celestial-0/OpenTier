# OpenTier API Gateway

**Rust-based API Gateway providing authentication, rate limiting, and streaming for the OpenTier platform.**

The API Gateway is the public-facing layer of OpenTier. It handles all external HTTP requests, enforces security policies, and bridges to the Python Intelligence Engine via gRPC.

---

## 🏗️ Architecture Role

```
Client (Web / Mobile / SDK)
        ↓
   ┌─────────────────────────┐
   │   API Gateway (Rust)    │  ← You are here
   │─────────────────────────│
   │ Auth & Identity         │
   │ Rate Limiting & Quotas  │
   │ Chat Streaming (SSE)    │
   │ Request Validation      │
   │ Backpressure & Timeouts │
   └───────────┬─────────────┘
               │ gRPC
               ↓
   ┌─────────────────────────┐
   │ Python Intelligence     │
   └─────────────────────────┘
```

The Rust layer is intentionally **non-intelligent** — it enforces policy, streams safely, but never performs reasoning or ML inference.

---

## 🚀 Features

- **Authentication**: Email/password, OAuth (GitHub, Google), session management
- **Authorization**: Role-based access control (User, Admin)
- **Rate Limiting**: Configurable per-endpoint throttling via Governor
- **Chat Streaming**: Server-Sent Events (SSE) for real-time responses
- **gRPC Bridge**: Tonic client for Intelligence Engine communication
- **Observability**: Structured logging with tracing
- **CORS**: Configurable cross-origin resource sharing

---

## 📂 Project Structure

```
api/
├── src/
│   ├── main.rs              # Application entrypoint
│   ├── admin/               # Admin endpoints (user management, stats)
│   ├── auth/                # Authentication & authorization
│   │   ├── handlers.rs      # HTTP handlers
│   │   ├── service.rs       # Business logic
│   │   ├── session.rs       # Session management
│   │   ├── tokens.rs        # Token generation/validation
│   │   ├── password.rs      # Password hashing
│   │   ├── oauth/           # OAuth providers (GitHub, Google)
│   │   ├── role.rs          # Role definitions
│   │   └── background.rs    # Session cleanup task
│   ├── chat/                # Chat endpoints
│   ├── user/                # User profile endpoints
│   ├── gateway/             # Route composition
│   │   ├── mod.rs           # Main router & AppState
│   │   ├── auth.rs          # Auth route group
│   │   ├── chat.rs          # Chat route group
│   │   ├── admin.rs         # Admin route group
│   │   ├── user.rs          # User route group
│   │   └── health.rs        # Health check endpoints
│   ├── grpc/                # gRPC client for Intelligence Engine
│   ├── middleware/          # Request middleware
│   │   ├── auth.rs          # Authentication guard
│   │   └── rate_limit.rs    # Rate limiting
│   ├── config/              # Configuration loading
│   ├── email/               # Email services (SMTP)
│   ├── common/              # Shared types & utilities
│   └── observability/       # Logging & tracing setup
├── migrations/              # SQLx database migrations
├── .sqlx/                   # Compile-time query cache
├── Cargo.toml
├── build.rs                 # Protobuf code generation
├── .env.example             # Environment template
└── .env                     # Local environment (not committed)
```

---

## 📦 Dependencies

| Category | Crate | Purpose |
|----------|-------|---------|
| Web | `axum` | HTTP framework |
| Async | `tokio` | Async runtime |
| gRPC | `tonic`, `prost` | Intelligence Engine bridge |
| Database | `sqlx` | PostgreSQL with compile-time checks |
| Auth | `bcrypt`, `oauth2` | Password hashing, OAuth flows |
| Rate Limit | `governor`, `tower_governor` | Request throttling |
| Email | `lettre` | SMTP for verification emails |
| Observability | `tracing` | Structured logging |

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret |
| `SMTP_*` | Email server configuration |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_HOST` | `127.0.0.1` | Bind address |
| `SERVER_PORT` | `8080` | Bind port |
| `RUST_LOG` | `api=debug` | Log level |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Requests per window |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate limit window |
| `SESSION_EXPIRY_SECONDS` | `2592000` | Session TTL (30 days) |
| `CORS_ALLOWED_ORIGINS` | localhost | Comma-separated origins |

---

## 🛠️ Development

### Prerequisites

- Rust 1.70+
- PostgreSQL 15+
- SQLx CLI: `cargo install sqlx-cli`

### Setup

```bash
# Install dependencies and build
cargo build

# Run database migrations
sqlx migrate run

# Start the server
cargo run
```

### Database Migrations

```bash
# Create a new migration
sqlx migrate add <name>

# Run pending migrations
sqlx migrate run

# Revert last migration
sqlx migrate revert
```

### Compile-Time Query Checking

SQLx validates queries at compile time. To prepare the query cache:

```bash
cargo sqlx prepare
```

---

## 🔌 API Endpoints

**Base URL:** `http://localhost:8080`

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health/api` | API layer health |
| GET | `/health/intelligence` | Intelligence service health |

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Email/password registration |
| POST | `/auth/signin` | Email/password login |
| POST | `/auth/signout` | End session (auth required) |
| POST | `/auth/refresh` | Refresh session token |
| GET | `/auth/verify-email` | Verify email token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| POST | `/auth/resend-verification` | Resend verification email |
| POST | `/auth/recover-account` | Recover soft-deleted account |
| GET | `/auth/oauth/{provider}/authorize` | Start OAuth flow |
| GET | `/auth/oauth/{provider}/callback` | OAuth callback handler |

### User (Authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/user/me` | Get current user profile |
| PATCH | `/user/update-profile` | Update profile |
| POST | `/user/change-password` | Change password |
| DELETE | `/user/delete-account` | Soft delete account |
| GET | `/user/list-sessions` | List active sessions |
| DELETE | `/user/revoke-session/{id}` | Revoke specific session |

### Chat (Authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/conversations` | Create conversation |
| GET | `/chat/conversations` | List conversations (paginated) |
| GET | `/chat/conversations/{id}` | Get conversation with messages |
| PATCH | `/chat/conversations/{id}` | Update conversation |
| DELETE | `/chat/conversations/{id}` | Delete conversation |
| POST | `/chat/conversations/{id}/messages` | Send message (non-streaming) |
| GET | `/chat/conversations/{id}/stream` | Stream response (SSE) |

### Admin (Admin Role Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List all users |
| GET | `/admin/users/{id}` | Get user details |
| PATCH | `/admin/users/{id}/role` | Update user role |
| DELETE | `/admin/users/{id}` | Hard delete user |
| GET | `/admin/stats` | System statistics |
| POST | `/admin/resources` | Add resource for ingestion |
| GET | `/admin/resources` | List resources |
| GET | `/admin/resources/{id}` | Get resource status |
| DELETE | `/admin/resources/{id}` | Delete resource |

---

## 🔒 Security

### Authentication Flow

1. Client calls `/auth/signup` or `/auth/signin` to get session token
2. Server validates credentials and creates session
3. Client includes token in `Authorization: Bearer <token>` header
4. `auth_middleware` validates token on protected routes
5. When token expires, use `/auth/refresh` with refresh token

### Token Expiration

| Token Type | Expiry |
|------------|--------|
| Session token | 24 hours |
| Refresh token | 30 days |
| Verification token | 7 days |
| Password reset token | 1 hour |

### Rate Limiting

Tiered rate limiting based on endpoint sensitivity:

| Tier | Limit | Endpoints |
|------|-------|----------|
| General | 100/min | Most API endpoints |
| Auth | 10/min | signin, signup, refresh, verify |
| Sensitive | 5/min | password reset, account recovery |

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706485000
```

### Session Management

- Sessions stored in PostgreSQL with automatic expiry
- Background task cleans expired sessions periodically
- Secure token generation using cryptographic randomness
- Users can list and revoke individual sessions

---

## 🧪 Testing

```bash
# Run all tests
cargo test

# Run with logging
RUST_LOG=debug cargo test -- --nocapture
```

---

## 📈 Observability

### Logging

Structured logging via `tracing`:

```bash
# Verbose logging
RUST_LOG=api=trace,tower_http=debug cargo run

# Production logging
RUST_LOG=api=info cargo run
```

### Health Checks

```bash
# Check API health
curl http://localhost:8080/health/api

# Check Intelligence service connectivity
curl http://localhost:8080/health/intelligence
```

---

## 🚢 Production

### Build Release

```bash
cargo build --release
```

### Run

```bash
./target/release/api
```

### Docker

See `../infra/` for Docker and deployment configurations.

---

## � Implementation Status

### ✅ Implemented

- Email/password authentication with verification
- OAuth integration (GitHub, Google)
- Password reset and account recovery
- Session management with revocation
- Conversations with full CRUD
- Chat messaging with RAG support
- SSE streaming for real-time responses
- Admin user management and role assignment
- Resource ingestion (URL, text, files)
- Tiered rate limiting
- Request tracing and observability

### 🏗️ Architecture Highlights

- **Type-safe queries**: SQLx compile-time verification
- **Background tasks**: Automatic session cleanup
- **Graceful degradation**: Works without Intelligence service
- **Cursor pagination**: Scalable list endpoints
- **Database transactions**: Atomic critical operations

---

## �📚 Related Documentation

- [Architecture Overview](../README.md) — Full system design

