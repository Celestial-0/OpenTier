# syntax=docker/dockerfile:1
FROM rust:slim-bookworm

# Install system dependencies required for building
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# install sqlx-cli
RUN cargo install sqlx-cli --no-default-features --features postgres

# Copy the source code for api
COPY . .
# Copy proto from the additional context
COPY --from=proto . ../proto/
# Copy migrations from db
COPY --from=db ./migrations ../db/migrations/

# Expose the port the app runs on
EXPOSE 4000

# Migrate the database, prepare the sql migrations using sqlx, and run
CMD ["sh", "-c", "sqlx migrate run --source ../db/migrations --database-url $DATABASE_URL && cargo sqlx prepare --database-url $DATABASE_URL && cargo run --release"]
