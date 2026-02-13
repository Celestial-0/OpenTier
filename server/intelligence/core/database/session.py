"""Database connection and session management."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import text
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool

from core.config import get_config
from .models import Base

logger = logging.getLogger(__name__)

# Global engine and session maker
_engine: AsyncEngine | None = None
_async_session_maker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Get or create database engine."""
    global _engine
    if _engine is None:
        config = get_config()

        # Convert postgresql:// to postgresql+asyncpg://
        url = config.database.url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # Choose pool class based on environment
        pool_class = AsyncAdaptedQueuePool if config.environment != "test" else NullPool

        logger.info(f"Creating database engine with pool_size={config.database.pool_size}")

        _engine = create_async_engine(
            url,
            pool_size=config.database.pool_size,
            max_overflow=config.database.max_overflow,
            pool_timeout=config.database.pool_timeout,
            pool_recycle=config.database.pool_recycle,
            pool_pre_ping=True,  # Verify connections before using
            echo=config.database.echo,
            poolclass=pool_class,
        )
    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Get or create session maker."""
    global _async_session_maker
    if _async_session_maker is None:
        engine = get_engine()
        _async_session_maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _async_session_maker


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session context manager."""
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}", exc_info=True)
            raise


async def init_db() -> None:
    """Initialize database (create tables)."""
    logger.info("Initializing database schema...")
    try:
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        raise


async def close_db() -> None:
    """Close database connections."""
    global _engine, _async_session_maker
    if _engine is not None:
        logger.info("Closing database connections...")
        await _engine.dispose()
        _engine = None
        _async_session_maker = None
        logger.info("Database connections closed")


async def health_check() -> bool:
    """Check database connectivity."""
    try:
        engine = get_engine()
        from sqlalchemy import select
        async with engine.connect() as conn:
            await conn.execute(select(1))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
