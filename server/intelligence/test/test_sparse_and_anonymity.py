import pytest
from shared.llm.embeddings import HashedSparseEncoder
from shared.qdrant.client import _dedupe_sparse
from features.billing.consumer import handle_chat_completed
from features.chat.memory import handle_memory_extraction
from core.events import EventEnvelope


def test_hashed_sparse_encoder_guarantees_unique_sorted_indices():
    # Dim 4 ensures heavy hash collisions
    encoder = HashedSparseEncoder(dim=4)
    text = "the quick brown fox jumps over the lazy dog and runs across the field repeatedly"
    indices, values = encoder.encode(text)

    # Must be non-empty
    assert len(indices) > 0
    assert len(indices) == len(values)
    # Must be strictly unique
    assert len(indices) == len(set(indices))
    # Must be sorted ascending
    assert indices == sorted(indices)
    # Weights should be positive
    assert all(v > 0 for v in values)


def test_dedupe_sparse_merges_duplicate_indices_and_sorts():
    raw_indices = [15, 3, 15, 8, 3, 100]
    raw_values = [0.5, 0.2, 0.4, 1.0, 0.8, 0.1]

    indices, values = _dedupe_sparse(raw_indices, raw_values)

    assert indices == [3, 8, 15, 100]
    assert values == [1.0, 1.0, 0.9, 0.1]


def test_dedupe_sparse_empty():
    assert _dedupe_sparse([], []) == ([], [])


@pytest.mark.asyncio
async def test_billing_consumer_skips_anonymous_ip_users():
    env = EventEnvelope(
        event_type="chat.turn.completed",
        correlation_id="corr-1",
        payload={
            "user_id": "ip:127.0.0.1",
            "message_id": "00000000-0000-0000-0000-000000000000",
            "conversation_id": "00000000-0000-0000-0000-000000000000",
            "model_slug": "gemini-2.5-flash-lite",
            "tokens_in": 100,
            "tokens_out": 50,
        },
    )
    await handle_chat_completed(env, "msg-1")


@pytest.mark.asyncio
async def test_memory_extractor_skips_anonymous_ip_users():
    env = EventEnvelope(
        event_type="chat.turn.completed",
        correlation_id="corr-2",
        payload={
            "user_id": "ip:172.18.0.1",
            "conversation_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    await handle_memory_extraction(env, "msg-1")
