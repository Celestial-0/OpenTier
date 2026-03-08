import asyncio
import sys
import uuid
import time

# Ensure we can import from the intelligence directory
sys.path.append(".")

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from core.lifecycle import startup, shutdown
from engine import IntelligenceEngine
from generated import intelligence_pb2


async def wait_for_job(engine: IntelligenceEngine, job_id: str, resource_id: str):
    """Poll the status of an ingestion job until it completes or fails."""
    print(f"\n[POLLING] Waiting for job {job_id} to complete...")

    start_time = time.time()
    timeout = 300  # 5 minutes

    while time.time() - start_time < timeout:
        status_res = await engine.get_resource_status(
            job_id=job_id, resource_id=resource_id
        )

        status_name = intelligence_pb2.ResourceStatus.Name(status_res.status)
        print(
            f"Status: {status_name} | Progress: {status_res.progress:.1f}% | Chunks: {status_res.chunks_created}"
        )

        if status_res.status == intelligence_pb2.RESOURCE_STATUS_COMPLETED:
            print(f"\n[SUCCESS] Ingestion completed in {time.time() - start_time:.1f}s")
            return True

        if status_res.status == intelligence_pb2.RESOURCE_STATUS_FAILED:
            print(f"\n[FAILED] Ingestion failed: {status_res.error}")
            return False

        await asyncio.sleep(2)

    print(f"\n[TIMEOUT] Ingestion timed out after {timeout}s")
    return False


async def run_test(target_url: str):
    print(f"\n{'=' * 60}")
    print(f"STARTING FULL INGESTION TEST FOR: {target_url}")
    print(f"{'=' * 60}")

    # 1. Initialize services
    print("\n[STEP 1] Starting intelligence services...")
    await startup()

    # 2. Setup Engine
    engine = IntelligenceEngine()

    # Use a dummy but valid UUID format for user_id
    test_user_id = str(uuid.uuid4())
    test_resource_id = str(uuid.uuid4())

    # 3. Queue Ingestion
    print(
        f"\n[STEP 2] Queuing resource ingestion (User: {test_user_id}, Resource: {test_resource_id})"
    )

    config = intelligence_pb2.IngestionConfig(
        auto_clean=True, max_depth=1, follow_links=False
    )

    add_res = await engine.add_resource(
        user_id=test_user_id,
        resource_id=test_resource_id,
        url=target_url,
        text=None,
        file_content=None,
        title=f"Test Ingestion: {target_url}",
        metadata={"test_run": "true"},
        config=config,
        resource_type=intelligence_pb2.RESOURCE_TYPE_WEBSITE,
    )

    job_id = add_res.job_id
    print(f"Queued! Job ID: {job_id}")

    # 4. Wait for completion
    success = await wait_for_job(engine, job_id, test_resource_id)

    if success:
        # 5. Verify Retrieval (RAG test)
        print("\n[STEP 3] Testing Retrieval (RAG)...")
        search_query = "What is this website about?"
        retrieval_res = await engine.retrieve_context_internal(
            search_query, user_id=test_user_id
        )

        chunks = retrieval_res.get("chunks", [])
        print(f"Retrieved {len(chunks)} relevant chunks.")

        if chunks:
            print("\n--- SAMPLE CHUNK ---")
            print(f"Score: {chunks[0]['relevance_score']:.4f}")
            print(f"Content: {chunks[0]['content'][:200]}...")

        # 6. Delete Resource
        print("\n[STEP 4] Cleaning up test resource...")
        deleted = await engine.delete_resource(test_resource_id, user_id=test_user_id)
        print(f"Deleted: {deleted}")

    # 7. Shutdown
    print("\n[STEP 5] Shutting down services...")
    await shutdown()

    print(f"\n{'=' * 60}")
    print(f"TEST {'PASSED' if success else 'FAILED'}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    target = "https://free-for.dev"
    if len(sys.argv) > 1:
        target = sys.argv[1]

    try:
        asyncio.run(run_test(target))
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback

        traceback.print_exc()
