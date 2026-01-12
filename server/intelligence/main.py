import sys
import asyncio
import logging
import signal
import grpc
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from interfaces.health import HealthService
from interfaces.chat import ChatService
from interfaces.resource import ResourceService

from generated import intelligence_pb2_grpc as pb_grpc
from core.lifecycle import startup, shutdown
from core.config import get_config
from engine import IntelligenceEngine

logger = logging.getLogger(__name__)


async def serve() -> None:
    """Start the gRPC server."""
    # Initialize services
    await startup()

    config = get_config()
    server = grpc.aio.server(
        options=[
            ("grpc.max_receive_message_length", 100 * 1024 * 1024),  # 100MB
            ("grpc.max_send_message_length", 100 * 1024 * 1024),  # 100MB
            ("grpc.keepalive_time_ms", 60000),  # 60 seconds
            ("grpc.keepalive_timeout_ms", 20000),  # 20 seconds
        ]
    )

    # Initialize Engine (The Brain)
    engine = IntelligenceEngine()

    # Register all services
    pb_grpc.add_HealthServicer_to_server(HealthService(), server)
    pb_grpc.add_ChatServicer_to_server(ChatService(engine), server)
    pb_grpc.add_ResourceServiceServicer_to_server(ResourceService(engine), server)

    server.add_insecure_port(f"[::]:{config.grpc_port}")

    logger.info(f"Intelligence gRPC server listening on port {config.grpc_port}")
    logger.info("Services: Health, Chat, Ingestion, Embedding, RAG, Scraping, Resource")

    # Setup signal handlers for graceful shutdown
    stop_event = asyncio.Event()

    def handle_signal(sig):
        logger.info(f"Received signal {sig}, initiating graceful shutdown...")
        stop_event.set()

    if sys.platform != "win32":
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, lambda s=sig: handle_signal(s))
    else:
        logger.info("Running on Windows: Use Ctrl+C to stop the server")

    try:
        await server.start()
        logger.info("Server started successfully")

        # Wait for shutdown signal
        await stop_event.wait()

    except asyncio.CancelledError:
        logger.info("Server cancelled, stopping...")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        raise
    finally:
        # Graceful shutdown
        logger.info("Stopping server...")
        await server.stop(grace=30)
        logger.info("Server stopped")
        await shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(serve())
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        raise
