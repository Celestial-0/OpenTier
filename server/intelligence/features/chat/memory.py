"""User memory extraction and event handler."""

from __future__ import annotations

import logging

from sqlalchemy import text


from core.events import EventEnvelope
from features.chat.repository import MemoryRepository
from shared.database.session import get_session
from shared.llm import ChatModelGateway

logger = logging.getLogger(__name__)

MEMORY_SYSTEM_PROMPT = """You are a memory extractor. Analyze the conversation and extract key facts about the user that should be remembered across sessions.
Extract facts like:
- Personal preferences (likes/dislikes)
- Work/study details
- Technical stack or tools they use
- Projects they are working on
- Key goals or constraints

Return facts in concise bullet points. If there are no new facts to remember, respond with 'NO_UPDATE'.
If the user explicitly asked to forget everything or clear memory, respond with 'FORGET_ALL'.
""".strip()


async def generate_memory_update(
    llm_gateway: ChatModelGateway,
    *,
    recent_messages: list[dict[str, str]],
    current_memory: str | None = None,
) -> str | None:
    """Extracts facts from recent messages and merges with current memory."""
    conv_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in recent_messages
    )
    user_prompt = f"""CONVERSATION:
{conv_text}

CURRENT MEMORY:
{current_memory or "Empty"}

TASK:
Extract any NEW personal facts from the conversation that are not already in the current memory.
Output the new facts, or output NO_UPDATE if there are no new facts."""

    try:
        response_text, _ = await llm_gateway.generate(
            [
                {"role": "system", "content": MEMORY_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )
        result = response_text.strip()
        logger.debug("Memory extraction raw result: %s", result)

        if "FORGET_ALL" in result:
            return "FORGET_ALL"
        if result == "NO_UPDATE" or "NO_UPDATE" in result:
            return None

        result = result.replace("`", "").strip()
        uncertain_keywords = [
            "unknown", "unspecified", "unclear", "not mentioned",
            "not stated", "not provided", "not given", "uncertain",
            "no information", "no data", "not sure", "maybe", "possibly",
        ]

        filtered_lines = []
        for line in result.split("\n"):
            line = line.strip()
            if not line:
                continue
            line_lower = line.lower()
            if any(kw in line_lower for kw in uncertain_keywords):
                continue
            filtered_lines.append(line)

        cleaned_result = "\n".join(filtered_lines)
        if len(cleaned_result) < 5:
            return None

        if current_memory:
            existing_facts = set(
                line.strip() for line in current_memory.split("\n") if line.strip()
            )
            new_facts = set(
                line.strip() for line in cleaned_result.split("\n") if line.strip()
            )
            return "\n".join(sorted(existing_facts | new_facts))
        return cleaned_result

    except Exception as e:
        logger.error("Memory extraction failed: %s", e)
        return None


async def handle_memory_extraction(
    envelope: EventEnvelope,
    msg_id: str,
    llm_gateway: ChatModelGateway | None = None,
) -> None:
    """Async memory extraction."""
    payload = dict(envelope.payload)
    conversation_id = str(payload.get("conversation_id", "")).strip()
    user_id = str(payload.get("user_id", "")).strip()
    if not conversation_id or not user_id or user_id.startswith("ip:"):
        logger.debug("memory extraction skipped: missing or anonymous user (msg %s)", msg_id)
        return

    async with get_session() as session:
        memory_repo = MemoryRepository(session)
        current_memory = await memory_repo.get_memory(user_id)

        raw = (
            await session.execute(
                text(
                    "SELECT role, content FROM chat_messages "
                    "WHERE conversation_id = :cid "
                    "ORDER BY created_at DESC LIMIT :lim"
                ),
                {"cid": conversation_id, "lim": 10},
            )
        ).all()
        recent_rows = [{"role": r[0], "content": r[1]} for r in raw]

    if not recent_rows:
        return

    if llm_gateway is None:
        from shared.llm import LangChainChatAdapter, ModelCatalog
        from shared.database.session import get_engine
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
        maker = async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
        catalog = ModelCatalog(maker)
        llm_gateway = LangChainChatAdapter(catalog)

    updated_memory = await generate_memory_update(
        llm_gateway,
        recent_messages=list(reversed(recent_rows)),
        current_memory=current_memory or None,
    )

    if updated_memory == "FORGET_ALL":
        async with get_session() as mem_session:
            await MemoryRepository(mem_session).delete_memory(user_id)
            await mem_session.commit()
        logger.info("memory cleared for user %s", user_id)
        return

    if not updated_memory:
        return

    async with get_session() as mem_session:
        await MemoryRepository(mem_session).update_memory(user_id, updated_memory)
        await mem_session.commit()
    logger.info("memory updated for user %s (msg %s)", user_id, msg_id)


__all__ = [
    "MEMORY_SYSTEM_PROMPT",
    "generate_memory_update",
    "handle_memory_extraction",
]
