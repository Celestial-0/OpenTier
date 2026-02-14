import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Add project root to sys.path
project_root = Path(__file__).parent.parent.absolute()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from core.database import get_session, UserMemory
from sqlalchemy import select


async def check_memories():
    async with get_session() as session:
        result = await session.execute(select(UserMemory))
        memories = result.scalars().all()
        print(f"Total memories: {len(memories)}")
        for m in memories:
            print(f"User ID: {m.user_id}")
            print(f"Memory: {m.memory}")
            print("-" * 50)


if __name__ == "__main__":
    asyncio.run(check_memories())
