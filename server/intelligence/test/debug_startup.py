import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(root_dir, ".env"))

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
