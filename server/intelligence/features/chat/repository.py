"""Repository for conversations, messages, and long-term memory."""

from __future__ import annotations

import base64
import uuid
from typing import Any

from sqlalchemy import and_, asc, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database.models import ChatMessage, Conversation, UserMemory


class ChatRepository:
    """Persistence operations for conversations and chat messages."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_conversation(
        self,
        user_id: str,
        title: str | None = None,
        metadata: dict[str, Any] | None = None,
        conversation_id: uuid.UUID | None = None,
    ) -> Conversation:
        conv = Conversation(
            id=conversation_id or uuid.uuid4(),
            user_id=user_id,
            title=title,
            metadata_=metadata or {},
        )
        self.session.add(conv)
        await self.session.flush()
        return conv

    async def get_conversation(self, conversation_id: uuid.UUID) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def get_message(self, message_id: uuid.UUID) -> ChatMessage | None:
        result = await self.session.execute(
            select(ChatMessage).where(ChatMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create_conversation(
        self, user_id: str, conversation_id: str | None = None
    ) -> Conversation:
        if conversation_id:
            try:
                conv_uuid = uuid.UUID(conversation_id)
                conv = await self.get_conversation(conv_uuid)
                if conv and conv.user_id == user_id:
                    return conv
                return await self.create_conversation(
                    user_id, conversation_id=conv_uuid
                )
            except ValueError:
                pass
        return await self.create_conversation(user_id)

    async def add_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        sources: list[dict[str, Any]] | None = None,
        metadata: dict[str, Any] | None = None,
        parent_id: uuid.UUID | None = None,
        message_id: uuid.UUID | None = None,
    ) -> ChatMessage:
        msg = ChatMessage(
            id=message_id or uuid.uuid4(),
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources=sources or [],
            metadata_=metadata or {},
            parent_id=parent_id,
        )
        self.session.add(msg)
        await self.session.flush()
        return msg

    async def get_messages(
        self,
        conversation_id: uuid.UUID,
        limit: int = 100,
        cursor: str | None = None,
    ) -> list[ChatMessage]:
        """Get messages for a conversation using keyset pagination."""
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(asc(ChatMessage.created_at), asc(ChatMessage.id))
            .limit(limit)
        )

        if cursor is not None:
            try:
                decoded = base64.b64decode(cursor).decode()
                parts = decoded.split(",", 1)
                if len(parts) == 2:
                    cursor_at, cursor_id = parts[0], parts[1]
                    stmt = stmt.where(
                        or_(
                            ChatMessage.created_at > cursor_at,
                            and_(
                                ChatMessage.created_at == cursor_at,
                                ChatMessage.id > cursor_id,
                            ),
                        )
                    )
            except Exception:
                pass

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_message_lineage(
        self, conversation_id: uuid.UUID, leaf_message_id: str | None = None
    ) -> list[ChatMessage]:
        """Linear conversation history tracing parent_id pointers backwards."""
        all_messages = await self.get_messages(conversation_id, limit=500)
        if not all_messages:
            return []

        msg_dict = {str(m.id): m for m in all_messages}
        if not leaf_message_id or leaf_message_id not in msg_dict:
            leaf_msg = all_messages[-1]
            leaf_message_id = str(leaf_msg.id)

        lineage = []
        current_id = leaf_message_id
        visited = set()

        while current_id and current_id in msg_dict and current_id not in visited:
            visited.add(current_id)
            msg = msg_dict[current_id]
            lineage.append(msg)

            metadata = msg.metadata_
            parent_id = (
                metadata.get("parent_id") if isinstance(metadata, dict) else None
            )
            if not parent_id:
                idx = all_messages.index(msg)
                if idx > 0:
                    parent_id = str(all_messages[idx - 1].id)

            current_id = parent_id

        lineage.reverse()
        return lineage

    async def delete_conversation(self, conversation_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(Conversation).where(Conversation.id == conversation_id)
        )
        return result.rowcount > 0

    async def list_user_conversations(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Conversation]:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())


class MemoryRepository:
    """Storage operations for long-term user memory."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_memory(self, user_id: str) -> str:
        result = await self.session.execute(
            select(UserMemory).where(UserMemory.user_id == user_id)
        )
        memory_obj = result.scalar_one_or_none()
        return memory_obj.memory if memory_obj else ""

    async def update_memory(self, user_id: str, new_memory: str) -> None:
        result = await self.session.execute(
            select(UserMemory).where(UserMemory.user_id == user_id)
        )
        memory_obj = result.scalar_one_or_none()
        if memory_obj:
            memory_obj.memory = new_memory
        else:
            memory_obj = UserMemory(user_id=user_id, memory=new_memory)
            self.session.add(memory_obj)
        await self.session.flush()

    async def delete_memory(self, user_id: str) -> bool:
        result = await self.session.execute(
            delete(UserMemory).where(UserMemory.user_id == user_id)
        )
        return result.rowcount > 0


__all__ = ["ChatRepository", "MemoryRepository"]
