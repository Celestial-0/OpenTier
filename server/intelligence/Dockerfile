# syntax=docker/dockerfile:1
ARG BASE_IMAGE=pytorch/pytorch:2.10.0-cuda13.0-cudnn9-runtime
FROM ${BASE_IMAGE}

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast Python package management
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh

# Set up working directory
WORKDIR /app

# Ensure non-root user for security and set up ownership
RUN useradd -m appuser \
    && chown -R appuser:appuser /app

# Switch to the non-root user before running uv
USER appuser

# Copy pyproject.toml, uv.lock, and other dependency files
COPY --chown=appuser:appuser pyproject.toml uv.lock ./

# Install dependencies using uv
# --no-dev to avoid installing dev dependencies (like pytest, ruff, mypy)
ARG UV_EXTRA_ARGS=""
RUN uv sync ${UV_EXTRA_ARGS}

# Install Playwright OS dependencies (requires root)
USER root
RUN uv run playwright install-deps chromium

# Switch back to appuser and install Playwright browsers
USER appuser
RUN uv run playwright install chromium

# Copy the rest of the application code
COPY --chown=appuser:appuser . .

# Expose the gRPC port
EXPOSE 50051

# Run the gRPC server
CMD ["uv", "run", "main.py"]
