# syntax=docker/dockerfile:1
FROM rust:slim-bookworm

# Install system dependencies required for building
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy the source code for api
COPY . .
# Copy proto from the additional context
COPY --from=proto . ../proto/

# Build the application
# We use --release to get an optimized binary
# Use sqlx offline mode so database is not required during build
ENV SQLX_OFFLINE=true
RUN cargo build --release

# Expose the port the app runs on
EXPOSE 4000

# Command to run the application
CMD ["cargo", "run", "--release"]
