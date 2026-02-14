"""Lifecycle management for the intelligence engine."""

import logging

from core.config import get_config, validate_config
from core.database import close_db, init_db
from core.logging import setup_logging

logger = logging.getLogger(__name__)


async def startup() -> None:
    """Initialize services on startup."""
    # Setup logging first
    config = get_config()
    setup_logging(config.log_level)

    logger.info(f"Starting intelligence service in {config.environment} mode")

    # Validate configuration
    try:
        validate_config()
        logger.info("Configuration validated successfully")
    except Exception as e:
        logger.error(f"Configuration validation failed: {e}")
        raise

    # Initialize database
    logger.info("Initializing database...")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


async def shutdown() -> None:
    """Cleanup on shutdown."""
    logger.info("Shutting down intelligence service...")
    try:
        await close_db()
        logger.info("Shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")
