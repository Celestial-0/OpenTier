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

    async def get_conversation(
        self, conversation_id: uuid.UUID
    ) -> Conversation | None:
        """Get conversation by ID."""
        result = await self.session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
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
                return await self.create_conversation(user_id, conversation_id=conv_uuid)
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
    ) -> ChatMessage:
        """Add a message to a conversation."""
        msg = ChatMessage(
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources=sources or [],
            metadata_=metadata or {},
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
        """Get messages for a conversation."""
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

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
