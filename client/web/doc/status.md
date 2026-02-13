# Client Implementation Status & Roadmap

This document tracks the integration status between the Next.js client and the Rust backend, based on deep analysis of the server architecture.

## 🧠 Backend Research Findings

### Architecture
- **API Gateway**: Rust (Axum) handling Auth, Rate Limits, and forwarding to Intelligence.
- **Intelligence**: Python (gRPC) handling RAG, LLM inference.
- **Protocol**: HTTP/1.1 for REST, SSE for Chat Streaming.

### Chat Streaming Implementation (`server/api/src/chat/handlers.rs`)
The server uses **Server-Sent Events (SSE)** for chat streaming.
- **Endpoint**: `GET /api/chat/conversations/{id}/stream`
- **Query Params**: `message`, `temperature`, `max_tokens`, `use_rag`, `model`.
- **Events**:
    - `message`: (string) The text content chunk of the assistant's response.
    - `source`: (JSON) `SourceChunk` object containing RAG source data.
    - `metrics`: (JSON) `ChatMetrics` object (tokens, latency) sent at the end.
    - `error`: (string) Error message.
    - `ping`: Keep-alive signal.

### Auth & User API
- **Auth**: cookie-based sessions (likely HttpOnly).
- **User**: Standard CRUD for profile, password, and account deletion.
- **Sessions**:
    - `GET /api/user/list-sessions`: List active sessions.
    - `DELETE /api/user/sessions/{session_id}`: Revoke a session.

---

## 📋 Implementation Checklist

### 1. Authentication & User (Phase 1 - ✅ Done)
- [x] **Auth Context**: Connected to `/api/auth/signin`, `/api/auth/signup`, `/api/auth/signout`.
- [x] **User Store**: Manages profile (`/api/user/me`) and preferences.
- [x] **Zod Schemas**: Strict typing for all Auth/User payloads.

### 2. Chat Core (Phase 2 - ✅ Done)
- [x] **Chat Store**: Implemented basic CRUD (`fetch`, `create`, `delete` conversations).
- [x] **Message Sending**: Implemented `POST` for non-streaming messages.
- [x] **Streaming Support**: Refactored `ChatStore` to support SSE via `EventSource` on `/api/chat/conversations/{id}/stream`.

### 3. UI Integration (Phase 3 - ✅ Done)
#### Chat Interface
- [x] **Chat Runtime**: Implemented `chat-runtime-adapter.ts` to bridge `ChatStore` and `@assistant-ui/react`.
    - Handles message streaming, thread listing, and thread switching.
- [x] **Chat Component**: Updated `AiChat` to use the custom adapter.
- [x] **Sidebar**: `ThreadListSidebar` now works via the adapter's `threads` provider.

#### Dashboard
- [x] **Sessions**: `sessions.tsx` fetches logic from `UserStore`.
- [x] **Profile**: `profile.tsx` connected to `updateProfile`.

### 4. Missing API Clients (Phase 4 - ✅ Done)
- [x] **Sessions API**: Added `fetchSessions` and `revokeSession` to `user-store.ts`.

### 5. Final Polish & "The Rest" (Phase 5 - 🚧 In Progress)
- [ ] **RAG Sources**:
    - The `ChatStore` receives `source` events, but the UI does not yet display them efficiently.
    - **Task**: Update `chat-runtime-adapter.ts` to format sources (e.g., append as markdown footnotes or custom attachments).
- [ ] **Error Handling**:
    - Ensure API errors (like 401s or 500s during chat) are surfaced to the user via the chat UI.
- [ ] **Mobile Responsiveness**: Verify the sidebar and chat area on smaller screens.

---

## 🛠️ Next Steps Strategy

1.  **Visualize RAG Sources**: Modify the adapter to append source citations to the message content.
2.  **UX Polish**: Verify loading states and error toasts in the UI.
