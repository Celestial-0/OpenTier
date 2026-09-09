import sys
import asyncio
import logging
import signal
import grpc
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the server root (one level up from the intelligence directory).
_here = Path(__file__).resolve().parent          # server/intelligence/
_server_env = _here.parent / ".env"              # server/.env
if _server_env.exists():
    load_dotenv(_server_env)
else:
    load_dotenv()  # fallback: CWD or Docker-injected env

# Ensure generated directory is in sys.path for protoc imports
_generated_dir = str(_here / "generated")
if _generated_dir not in sys.path:
    sys.path.insert(0, _generated_dir)

from generated import intelligence_pb2_grpc as pb_grpc
from core.lifecycle import startup, shutdown
from core.config import get_config

from features.health import HealthService
from features.knowledge import KnowledgeService, ResourceService
from features.chat import ChatService, ChatServicer, QueryPipeline, _build_llm_client


logger = logging.getLogger(__name__)


async def serve() -> None:
    """Start the gRPC server with feature-based services."""
    await startup()

    config = get_config()
    server = grpc.aio.server(
        options=[
            ("grpc.max_receive_message_length", 100 * 1024 * 1024),  # 100MB
            ("grpc.max_send_message_length", 100 * 1024 * 1024),  # 100MB
            ("grpc.keepalive_time_ms", 60000),  # 60 seconds
            ("grpc.keepalive_timeout_ms", 20000),  # 20 seconds
            ("grpc.http2.min_ping_interval_without_data_ms", 5000),
            ("grpc.http2.min_time_between_pings_ms", 5000),
            ("grpc.http2.max_ping_strikes", 0),  # Unlimited pings allowed
            ("grpc.keepalive_permit_without_calls", 1),
        ]

    )

    # Initialize feature services
    health_service = HealthService()
    knowledge_service = KnowledgeService()
    resource_servicer = ResourceService(knowledge_service)

    llm_client = _build_llm_client()
    query_pipeline = QueryPipeline(llm_client=llm_client)
    chat_service = ChatService(query_pipeline)
    chat_servicer = ChatServicer(chat_service)

    # Register all servicers
    pb_grpc.add_HealthServicer_to_server(health_service, server)
    pb_grpc.add_ChatServicer_to_server(chat_servicer, server)
    pb_grpc.add_ResourceServiceServicer_to_server(resource_servicer, server)

    server.add_insecure_port(f"[::]:{config.grpc_port}")

    logger.info(f"Intelligence gRPC server listening on port {config.grpc_port}")
    logger.info("Feature slices: Health, Knowledge, Chat, Billing")

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
        await stop_event.wait()
    except asyncio.CancelledError:
        logger.info("Server cancelled, stopping...")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        raise
    finally:
        logger.info("Stopping server...")
        await server.stop(grace=30)
        logger.info("Server stopped")
        await shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(serve())
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
    except Exception as e:
        logger.critical(f"Fatal startup error: {e}", exc_info=True)
        sys.exit(1)
