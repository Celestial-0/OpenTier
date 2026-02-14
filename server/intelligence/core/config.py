"""Configuration management for the intelligence engine."""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseConfig(BaseSettings):
    """Database configuration."""

    url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/opentier",
        description="PostgreSQL database URL",
    )
    pool_size: int = Field(default=10, description="Connection pool size", ge=1, le=100)
    max_overflow: int = Field(
        default=20, description="Max overflow connections", ge=0, le=100
    )
    echo: bool = Field(default=False, description="Echo SQL queries")
    pool_timeout: int = Field(default=30, description="Pool timeout in seconds", ge=1)
    pool_recycle: int = Field(
        default=3600, description="Pool recycle time in seconds", ge=60
    )

    model_config = SettingsConfigDict(env_prefix="DB_", extra="ignore")


class IngestionConfig(BaseSettings):
    """Ingestion service configuration."""

    chunk_size: int = Field(
        default=512, description="Default chunk size in tokens", ge=100, le=2000
    )
    chunk_overlap: int = Field(
        default=50, description="Overlap between chunks", ge=0, le=500
    )
    max_batch_size: int = Field(
        default=100, description="Max documents per batch", ge=1, le=1000
    )
    auto_clean: bool = Field(default=True, description="Auto-clean documents")
    cleaning_strategy: str = Field(
        default="standard",
        description="Cleaning strategy: minimal, standard, or aggressive",
    )
    generate_embeddings: bool = Field(
        default=True, description="Auto-generate embeddings"
    )
    max_content_length: int = Field(
        default=1000000, description="Max content length in chars", ge=1000
    )

    model_config = SettingsConfigDict(env_prefix="INGESTION_", extra="ignore")


class EmbeddingConfig(BaseSettings):
    """Embedding service configuration."""

    model_name: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Embedding model name",
    )
    dimensions: int = Field(
        default=384, description="Embedding dimensions", ge=128, le=4096
    )
    batch_size: int = Field(
        default=32, description="Batch size for embeddings", ge=1, le=256
    )
    device: str | None = Field(
        default=None,
        description="Device to use (cuda/cpu/auto). if None, auto-detects.",
    )
    normalize: bool = Field(default=True, description="Normalize embeddings")
    cache_size: int = Field(default=10000, description="Cache size")
    query_instruction: str = Field(
        default="",
        description="Instruction to prepend to queries (optional)",
    )

    model_config = SettingsConfigDict(env_prefix="EMBEDDING_", extra="ignore")


class ScrapingConfig(BaseSettings):
    """Web scraping configuration."""

    timeout: int = Field(
        default=30, description="Request timeout in seconds", ge=5, le=120
    )
    max_retries: int = Field(default=3, description="Max retry attempts", ge=0, le=10)
    user_agent: str = Field(
        default="OpenTier Intelligence Bot/1.0",
        description="User agent for requests",
    )

    model_config = SettingsConfigDict(env_prefix="SCRAPING_", extra="ignore")


class LLMConfig(BaseSettings):
    """LLM configuration."""

    provider: str = Field(
        default="openai", description="LLM provider (openai, anthropic, mock)"
    )
    api_key: str = Field(default="", description="API Key")
    model: str = Field(default="gpt-4o", description="Model name")
    base_url: str = Field(
        default="https://api.openai.com/v1",
        description="Base URL for OpenAI compatible APIs",
    )
    temperature: float = Field(default=0.7, description="Default temperature")
    max_tokens: int = Field(default=1000, description="Default max tokens")

    model_config = SettingsConfigDict(env_prefix="LLM_", extra="ignore")


class Config(BaseSettings):
    """Main configuration."""

    environment: str = Field(
        default="development",
        description="Environment (development/staging/production)",
    )
    log_level: str = Field(default="INFO", description="Logging level")
    grpc_port: int = Field(
        default=50051, description="gRPC server port", ge=1024, le=65535
    )

    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    ingestion: IngestionConfig = Field(default_factory=IngestionConfig)
    embedding: EmbeddingConfig = Field(default_factory=EmbeddingConfig)
    scraping: ScrapingConfig = Field(default_factory=ScrapingConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v = v.upper()
        if v not in valid_levels:
            raise ValueError(f"Invalid log level. Must be one of: {valid_levels}")
        return v

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment."""
        valid_envs = ["development", "staging", "production"]
        v = v.lower()
        if v not in valid_envs:
            raise ValueError(f"Invalid environment. Must be one of: {valid_envs}")
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )


# Global config instance
_config: Config | None = None


def get_config() -> Config:
    """Get or create global config instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config


def validate_config() -> None:
    """Validate configuration on startup."""
    config = get_config()

    # Check database URL format
    if not config.database.url.startswith(("postgresql://", "postgresql+asyncpg://")):
        raise ValueError(
            "Database URL must start with postgresql:// or postgresql+asyncpg://"
        )

    # Warn if using default password in production
    if (
        config.environment == "production"
        and "postgres:postgres" in config.database.url
    ):
        import warnings

        warnings.warn("Using default database credentials in production!", UserWarning)
