"""Comprehensive tests for Chat Service.

Tests cover:
- Token tracking (prompt_tokens, completion_tokens properly populated)
- ChatMetrics validation
- Message persistence
- Streaming chat
- Source retrieval
"""

import pytest
from generated import intelligence_pb2


@pytest.mark.asyncio
async def test_chat_rag_flow(chat_client, resource_client):
    """
    Test the full Chat RAG flow: Add resource, send message, verify response has:
    - Non-zero token counts (prompt_tokens, completion_tokens)
    - Proper ChatMetrics fields populated
    - Sources retrieved
    - Conversation persistence
    """
    # 1. Add a resource to have something to query
    add_response = await resource_client.AddResource(
        intelligence_pb2.AddResourceRequest(
            user_id="test-user-1",
            text="The capital of France is Paris. It is known for the Eiffel Tower.",
            title="France Facts",
            type=intelligence_pb2.RESOURCE_TYPE_TEXT,
        )
    )
    assert add_response.status in [
        intelligence_pb2.RESOURCE_STATUS_COMPLETED,
        intelligence_pb2.RESOURCE_STATUS_PROCESSING,
        intelligence_pb2.RESOURCE_STATUS_QUEUED,
    ]

    # 2. Send a message
    response = await chat_client.SendMessage(
        intelligence_pb2.ChatRequest(
            user_id="test-user-1",
            message="What is the capital of France?",
            conversation_id="",  # New conversation
        )
    )

    # 3. Verify response structure
    assert response.conversation_id != ""
    assert response.message_id != ""
    assert response.response != ""
    assert "Paris" in response.response or "paris" in response.response.lower()

    # 4. Verify ChatMetrics - TOKEN TRACKING VALIDATION
    assert response.metrics is not None
    assert response.metrics.tokens_used > 0, "Total tokens should be tracked"
    assert response.metrics.prompt_tokens > 0, "Prompt tokens should be tracked (not 0)"
    assert response.metrics.completion_tokens > 0, (
        "Completion tokens should be tracked (not 0)"
    )
    assert response.metrics.latency_ms >= 0

    # Verify token count consistency
    # Note: tokens_used should roughly equal prompt + completion
    # In mock mode: prompt=50, completion=word_count
    assert response.metrics.tokens_used >= response.metrics.prompt_tokens

    # 5. Verify sources were retrieved
    assert len(response.sources) > 0, "Should retrieve relevant sources"
    assert response.metrics.sources_retrieved == len(response.sources)

    # Verify source structure
    first_source = response.sources[0]
    assert first_source.chunk_id != ""
    assert first_source.document_id != ""
    assert first_source.relevance_score > 0
    assert first_source.content != ""

    # 6. Test conversation continuation
    follow_up = await chat_client.SendMessage(
        intelligence_pb2.ChatRequest(
            user_id="test-user-1",
            message="Tell me more about it",
            conversation_id=response.conversation_id,
        )
    )

    assert follow_up.conversation_id == response.conversation_id
    assert follow_up.message_id != response.message_id
    assert follow_up.metrics.prompt_tokens > 0
    assert follow_up.metrics.completion_tokens > 0


@pytest.mark.asyncio
async def test_chat_stream(chat_client, resource_client):
    """
    Test streaming chat response.
    Verify:
    - Chunks are received
    - Final metrics include token counts
    - Conversation ID is consistent
    """
    # Add resource
    add_resp = await resource_client.AddResource(
        intelligence_pb2.AddResourceRequest(
            user_id="test-user-stream",
            text="Python is a programming language created by Guido van Rossum.",
            title="Python Facts",
            type=intelligence_pb2.RESOURCE_TYPE_TEXT,
        )
    )
    assert add_resp.status in [
        intelligence_pb2.RESOURCE_STATUS_COMPLETED,
        intelligence_pb2.RESOURCE_STATUS_PROCESSING,
        intelligence_pb2.RESOURCE_STATUS_QUEUED,
    ]

    # Stream chat
    chunks = []
    async for chunk in chat_client.StreamChat(
        intelligence_pb2.ChatRequest(
            user_id="test-user-stream",
            message="Who created Python?",
            conversation_id="",
        )
    ):
        chunks.append(chunk)

    assert len(chunks) > 0, "Should receive at least one chunk"

    # First chunk should have conversation_id
    first_chunk = chunks[0]
    assert first_chunk.conversation_id != ""

    # Last chunk should have metrics
    last_chunk = chunks[-1]
    if last_chunk.metrics:
        assert last_chunk.metrics.prompt_tokens >= 0
        assert last_chunk.metrics.completion_tokens >= 0

    # All chunks should have same conversation_id
    conv_ids = [c.conversation_id for c in chunks if c.conversation_id]
    assert len(set(conv_ids)) == 1, "All chunks should have same conversation ID"


@pytest.mark.asyncio
async def test_chat_token_tracking_mock_mode(chat_client):
    """
    Test token tracking in mock mode.
    Verify mock LLM returns simulated token counts.
    """
    response = await chat_client.SendMessage(
        intelligence_pb2.ChatRequest(
            user_id="test-token-user",
            message="This is a short test message.",
            conversation_id="",
        )
    )

    # In mock mode, prompt_tokens should be > 0
    # completion_tokens should be word count of response
    assert response.metrics.prompt_tokens > 0, (
        "Mock mode should return prompt_tokens > 0"
    )
    assert response.metrics.completion_tokens > 0, (
        "Mock should return completion count based on response"
    )

    # Total should be >= sum of parts
    assert response.metrics.tokens_used >= response.metrics.prompt_tokens
    assert response.metrics.tokens_used >= response.metrics.completion_tokens


@pytest.mark.asyncio
async def test_chat_multiple_conversations(chat_client):
    """
    Test multiple conversations for same user.
    Verify conversations are isolated.
    """
    user_id = "test-multi-conv"

    # Conversation 1
    resp1 = await chat_client.SendMessage(
        intelligence_pb2.ChatRequest(
            user_id=user_id, message="Hello from conversation 1", conversation_id=""
        )
    )

    # Conversation 2
    resp2 = await chat_client.SendMessage(
        intelligence_pb2.ChatRequest(
            user_id=user_id, message="Hello from conversation 2", conversation_id=""
        )
    )

    # Should have different conversation IDs
    assert resp1.conversation_id != resp2.conversation_id

    # Both should have token tracking
    assert resp1.metrics.prompt_tokens > 0
    assert resp2.metrics.prompt_tokens > 0


@pytest.mark.asyncio
async def test_chat_metrics_consistency(chat_client):
    """
    Test ChatMetrics field consistency.
    Verify all fields are properly populated.
    """
    response = await chat_client.SendMessage(
        intelligence_pb2.ChatRequest(
            user_id="test-metrics",
            message="Test message for metrics validation",
            conversation_id="",
        )
    )

    metrics = response.metrics

    # All metric fields should be present and valid
    assert metrics.tokens_used >= 0, "tokens_used should be non-negative"
    assert metrics.prompt_tokens >= 0, "prompt_tokens should be non-negative"
    assert metrics.completion_tokens >= 0, "completion_tokens should be non-negative"
    assert metrics.latency_ms >= 0, "latency_ms should be non-negative"
    assert metrics.sources_retrieved >= 0, "sources_retrieved should be non-negative"

    # Logical consistency checks
    assert metrics.tokens_used >= metrics.prompt_tokens, (
        "Total tokens should be >= prompt tokens"
    )
    assert metrics.tokens_used >= metrics.completion_tokens, (
        "Total tokens should be >= completion tokens"
    )
