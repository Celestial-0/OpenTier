"""DLQ operations: list, replay, purge dead-letter streams.

Run:
    uv run python scripts/dlq.py list
    uv run python scripts/dlq.py replay opentier:jobs:ingestion --limit 20
    uv run python scripts/dlq.py purge  opentier:jobs:ingestion

Note: use the canonical stream names from ``core.events.Streams``; the
examples above reference the ingestion stream literally for readability.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.events import Streams
from shared.redis import DEFAULT_MAXLEN


def dlq_for(stream: str) -> str:
    return Streams.dlq(stream)


def source_of(dlq_name: str) -> str:
    return dlq_name[: -len(":dlq")] if dlq_name.endswith(":dlq") else dlq_name


async def list_entries(client, args) -> None:
    streams = [args.stream] if args.stream else _known_dlqs()
    for s in streams:
        name = dlq_for(s)
        length = await client.xlen(name)
        print(f"{name}: {length} entries")
        if args.verbose and length:
            entries = await client.xrange(name, "-", "+", count=args.limit)
            for msg_id, fields in entries:
                d = {
                    k.decode() if isinstance(k, bytes) else k: (
                        v.decode() if isinstance(v, bytes) else v
                    )
                    for k, v in fields.items()
                }
                print(
                    f"  {msg_id.decode() if isinstance(msg_id, bytes) else msg_id}"
                    f" type={d.get('event_type')} err={d.get('dlq_error', '')[:80]}"
                )


async def replay(client, args) -> None:
    src = dlq_for(args.stream)
    dst = source_of(args.stream)
    entries = await client.xrange(src, "-", "+", count=args.limit)
    count = 0
    for msg_id, fields in entries:
        fields = {k: v for k, v in fields.items()}
        await client.xadd(dst, fields, maxlen=DEFAULT_MAXLEN, approximate=True)
        await client.xdel(src, msg_id)
        count += 1
    print(f"replayed {count} entries {src} -> {dst}")


async def purge(client, args) -> None:
    name = dlq_for(args.stream)
    n = await client.xlen(name)
    await client.delete(name)
    print(f"purged {n} entries from {name}")


def _known_dlqs():
    return [Streams.CHAT_EVENTS, Streams.INGESTION_JOBS, Streams.LIFECYCLE_EVENTS]


async def main() -> int:
    parser = argparse.ArgumentParser(description="DLQ operations")
    parser.add_argument("command", choices=["list", "replay", "purge"])
    parser.add_argument("stream", nargs="?", help="source stream (adds :dlq)")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    import redis.asyncio as aioredis

    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    client = aioredis.from_url(url, decode_responses=False)

    if args.command == "list":
        await list_entries(client, args)
    elif args.command == "replay":
        if not args.stream:
            print("--stream required for replay")
            return 2
        await replay(client, args)
    elif args.command == "purge":
        if not args.stream:
            print("--stream required for purge")
            return 2
        await purge(client, args)

    await client.aclose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
