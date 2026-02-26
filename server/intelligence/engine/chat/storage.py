"""Storage layer for chat conversations."""

import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import ChatMessage, Conversation


class ConversationStorage:
    """Storage operations for conversations and messages."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_conversation(
        self,
        user_id: str,
        title: str | None = None,
        metadata: dict[str, Any] | None = None,
        conversation_id: uuid.UUID | None = None,
    ) -> Conversation:
        """Create a new conversation."""
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
        """Get conversation by ID."""
        result = await self.session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def get_message(self, message_id: uuid.UUID) -> ChatMessage | None:
        """Get message by ID."""
        result = await self.session.execute(
            select(ChatMessage).where(ChatMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create_conversation(
        self, user_id: str, conversation_id: str | None = None
    ) -> Conversation:
        """Get existing conversation or create new one."""
        if conversation_id:
            try:
                conv_uuid = uuid.UUID(conversation_id)
                conv = await self.get_conversation(conv_uuid)
                if conv and conv.user_id == user_id:
                    return conv

                # If ID was provided but not found, create with that ID
                return await self.create_conversation(
                    user_id, conversation_id=conv_uuid
                )
            except ValueError:
                pass

        # Create new conversation with random ID
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
        """Add a message to a conversation."""
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
        offset: int = 0,
    ) -> list[ChatMessage]:
        """Get ALL messages for a conversation, ordered chronologically.
        Useful for building the message tree on the client."""
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_message_lineage(
        self, conversation_id: uuid.UUID, leaf_message_id: str | None = None
    ) -> list[ChatMessage]:
        """
        Get the linear conversation history by tracing parent_id pointers backwards.
        If leaf_message_id is not provided, defaults to the most recent message.
        """
        all_messages = await self.get_messages(conversation_id, limit=500)
        if not all_messages:
            return []

        msg_dict = {str(m.id): m for m in all_messages}

        # If no leaf provided, find the most chronological message
        if not leaf_message_id or leaf_message_id not in msg_dict:
            leaf_msg = all_messages[-1]
            leaf_message_id = str(leaf_msg.id)

        # Trace backwards
        lineage = []
        current_id = leaf_message_id

        # Guard against infinite loops in corrupted metadata
        visited = set()

        while current_id and current_id in msg_dict and current_id not in visited:
            visited.add(current_id)
            msg = msg_dict[current_id]
            lineage.append(msg)

            # Get parent_id from metadata
            metadata = msg.metadata_
            parent_id = (
                metadata.get("parent_id") if isinstance(metadata, dict) else None
            )

            # If no explicit parent, assume the message directly before it in time is its parent
            # (Fallback for old messages before branching was implemented)
            if not parent_id:
                idx = all_messages.index(msg)
                if idx > 0:
                    parent_id = str(all_messages[idx - 1].id)

            current_id = parent_id

        # Reverse to return chronological order (oldest to newest)
        lineage.reverse()
        return lineage

    async def delete_conversation(self, conversation_id: uuid.UUID) -> bool:
        """Delete conversation and all messages."""
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
        """List conversations for a user."""
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())


class MemoryStorage:
    """Storage operations for long-term user memory."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_memory(self, user_id: str) -> str:
        """Get long-term memory for a user."""
        from core.database import UserMemory

        result = await self.session.execute(
            select(UserMemory).where(UserMemory.user_id == user_id)
        )
        memory_obj = result.scalar_one_or_none()
        return memory_obj.memory if memory_obj else ""

    async def update_memory(self, user_id: str, new_memory: str) -> None:
        """Update or create long-term memory for a user."""
        from core.database import UserMemory

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
        """Delete long-term memory for a user."""
        from core.database import UserMemory

        result = await self.session.execute(
            delete(UserMemory).where(UserMemory.user_id == user_id)
        )
        return result.rowcount > 0
