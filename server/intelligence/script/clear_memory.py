import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env from server root (script/ -> intelligence/ -> server/)
_server_env = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_server_env if _server_env.exists() else None)

# Add intelligence root to sys.path
project_root = Path(__file__).parent.parent.absolute()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from core.database import get_session, UserMemory
from sqlalchemy import delete


async def clear_all_memories():
    async with get_session() as session:
        result = await session.execute(delete(UserMemory))
        await session.commit()
        print(f"Deleted {result.rowcount} memory entries")


if __name__ == "__main__":
    asyncio.run(clear_all_memories())
