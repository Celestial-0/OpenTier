import asyncio
import pytest
import pytest_asyncio
import grpc
import os
from dotenv import load_dotenv

# Load environment variables from the intelligence root
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(root_dir, ".env"))

from core.lifecycle import startup, shutdown
from core.database import get_session, init_db
from core.config import get_config
from generated import intelligence_pb2_grpc as pb_grpc

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_env():
    """Real test environment - FUNCTION SCOPE for reliability on Windows."""
    print("\n[DEBUG] Starting test environment (Function scope)...")

    # 1. Start lifecycle (DB, etc.)
    await startup()
    # Explicitly init DB to ensure tables for current test run
    await init_db()

    # 2. Start gRPC server in background
    from engine import IntelligenceEngine
    from interfaces.health import HealthService
    from interfaces.chat import ChatService
    from interfaces.resource import ResourceService

    engine = IntelligenceEngine()
    server = grpc.aio.server()

    pb_grpc.add_HealthServicer_to_server(HealthService(), server)
    pb_grpc.add_ChatServicer_to_server(ChatService(engine), server)
    pb_grpc.add_ResourceServiceServicer_to_server(ResourceService(engine), server)

    # Let gRPC pick a random free port
    port = server.add_insecure_port("127.0.0.1:0")
    print(f"[DEBUG] gRPC test server LIVES on port {port}")
    await server.start()

    yield port

    # 3. Shutdown
    await server.stop(grace=0)
    await shutdown()

@pytest.fixture(scope="function")
def grpc_addr(setup_test_env):
    port = setup_test_env
    return f"127.0.0.1:{port}"

@pytest_asyncio.fixture(scope="function")
async def health_client(grpc_addr) -> pb_grpc.HealthStub:
    async with grpc.aio.insecure_channel(grpc_addr) as channel:
        yield pb_grpc.HealthStub(channel)

@pytest_asyncio.fixture(scope="function")
async def chat_client(grpc_addr) -> pb_grpc.ChatStub:
    async with grpc.aio.insecure_channel(grpc_addr) as channel:
        yield pb_grpc.ChatStub(channel)

@pytest_asyncio.fixture(scope="function")
async def resource_client(grpc_addr) -> pb_grpc.ResourceServiceStub:
    async with grpc.aio.insecure_channel(grpc_addr) as channel:
        yield pb_grpc.ResourceServiceStub(channel)

@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with get_session() as session:
        yield session
