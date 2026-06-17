import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from server root (test/ -> intelligence/ -> server/)
_server_env = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_server_env if _server_env.exists() else None)


from core.lifecycle import startup, shutdown


async def main():
    print("[DEBUG] Calling startup()...")
    await startup()
    print("[DEBUG] startup() returned successfully!")

    print("[DEBUG] Calling shutdown()...")
    await shutdown()
    print("[DEBUG] shutdown() returned successfully!")


if __name__ == "__main__":
    asyncio.run(main())
