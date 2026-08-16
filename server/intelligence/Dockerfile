# syntax=docker/dockerfile:1

ARG BASE_IMAGE=debian:bookworm-slim
ARG UV_EXTRA_ARGS="--extra cpu"

# ── Stage 1: Builder ──────────────────────────────────────────────────
FROM ${BASE_IMAGE} AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv from Astral
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Configure global Python installation dir in /opt so all users have access
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_INSTALL_DIR=/opt/uv/python \
    PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright

# Copy project specification
COPY pyproject.toml uv.lock* .python-version* ./

ARG UV_EXTRA_ARGS="--extra cpu"
# Sync dependencies and download managed Python into /opt/uv/python
RUN uv sync --frozen --no-dev --no-install-project ${UV_EXTRA_ARGS} || \
    uv sync --no-dev --no-install-project ${UV_EXTRA_ARGS}

# Copy full application code and complete project sync
COPY . .
RUN uv sync --no-dev ${UV_EXTRA_ARGS}

# Download Chromium browser binary
RUN uv run playwright install chromium

# ── Stage 2: Production Runner ────────────────────────────────────────
FROM ${BASE_IMAGE} AS runner

# Install uv from Astral in runner
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy managed Python runtime from /opt/uv and application from builder
COPY --from=builder /opt/uv /opt/uv
COPY --from=builder /app /app

# Install runtime utilities and Playwright OS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && uv run --project /app playwright install-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and group (UID 10001) and grant full read/execute permissions
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -s /bin/bash -m appuser && \
    chown -R appuser:appuser /app /opt/uv /home/appuser && \
    chmod -R 775 /app /opt/uv /home/appuser

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_PYTHON_INSTALL_DIR=/opt/uv/python \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:/opt/uv/python/bin:$PATH" \
    PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright

USER appuser:appuser

# Expose gRPC port
EXPOSE 50051

# Healthcheck checking TCP connectivity on gRPC port using uv
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD uv run python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.connect(('127.0.0.1', 50051)); s.close()" || exit 1

CMD ["uv", "run", "--no-dev", "main.py"]
