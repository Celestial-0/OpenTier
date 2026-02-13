import asyncio
import sys
from pathlib import Path
from typing import List, Tuple

from sqlalchemy import text, select, Table, Column, String, MetaData, DateTime, func
from sqlalchemy.ext.asyncio import AsyncConnection

from core.database import get_engine
from core.logging import get_logger

logger = get_logger(__name__)

# Define migrations table for SQLAlchemy Core
metadata = MetaData()
migrations_table = Table(
    "_intelligence_migrations",
    metadata,
    Column("version", String(255), primary_key=True),
    Column("applied_at", DateTime(timezone=True), server_default=func.now(), nullable=False)
)

async def create_migrations_table(conn: AsyncConnection) -> None:
    """Create migrations tracking table if it doesn't exist."""
    await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS _intelligence_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))

async def get_applied_migrations(conn: AsyncConnection) -> set:
    """Get list of already applied migrations."""
    result = await conn.execute(select(migrations_table.c.version))
    return {row[0] for row in result.fetchall()}

def get_migration_files(migrations_dir: Path) -> List[Tuple[str, Path]]:
    """Get all .up.sql migration files sorted by version."""
    migrations = []
    for file in migrations_dir.glob("*.up.sql"):
        version = file.stem.split('_')[0]
        migrations.append((version, file))

    migrations.sort(key=lambda x: x[0])
    return migrations

async def run_migration(conn: AsyncConnection, version: str, file_path: Path) -> None:
    """Run a single migration file."""
    print(f"  Applying {file_path.name}...", end=" ", flush=True)

    sql = file_path.read_text(encoding='utf-8')

    # Execute migration SQL and track it
    try:
        # We use text() but it's for the content of the migration file
        await conn.execute(text(sql))
        await conn.execute(
            migrations_table.insert().values(version=version)
        )
        print("OK")
    except Exception as e:
        print("FAILED")
        logger.error(f"Migration {version} failed: {e}")
        raise

async def run_migrations() -> None:
    """Main migration runner."""
    migrations_dir = Path(__file__).parent.parent / "migrations"
    if not migrations_dir.exists():
        print(f"Error: Migrations directory not found: {migrations_dir}")
        sys.exit(1)

    engine = get_engine()

    async with engine.begin() as conn:
        # Create migrations tracking table
        await create_migrations_table(conn)

        # Get applied migrations
        applied = await get_applied_migrations(conn)
        print(f"Found {len(applied)} already applied migrations")

        # Get all migration files
        migrations = get_migration_files(migrations_dir)
        print(f"Found {len(migrations)} total migrations")

        # Run pending migrations
        pending = [(v, f) for v, f in migrations if v not in applied]

        if not pending:
            print("\n✓ All migrations are up to date!")
            return

        print(f"\nApplying {len(pending)} pending migrations:")
        for version, file_path in pending:
            await run_migration(conn, version, file_path)

        print(f"\n✓ Successfully applied {len(pending)} migrations!")

async def rollback_migration(version: str) -> None:
    """Rollback a specific migration."""
    migrations_dir = Path(__file__).parent.parent / "migrations"

    down_files = list(migrations_dir.glob(f"{version}_*.down.sql"))
    if not down_files:
        print(f"Error: No rollback file found for version {version}")
        sys.exit(1)

    down_file = down_files[0]
    print(f"Rolling back {down_file.name}...")

    engine = get_engine()
    async with engine.begin() as conn:
        sql = down_file.read_text(encoding='utf-8')

        await conn.execute(text(sql))
        await conn.execute(
            migrations_table.delete().where(migrations_table.c.version == version)
        )

        print(f"✓ Successfully rolled back migration {version}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        if len(sys.argv) < 3:
            print("Usage: python migrate.py rollback <version>")
            sys.exit(1)
        asyncio.run(rollback_migration(sys.argv[2]))
    else:
        asyncio.run(run_migrations())
