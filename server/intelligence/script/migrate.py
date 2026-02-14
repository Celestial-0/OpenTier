import asyncio
import os
import sys
from pathlib import Path
from typing import List, Tuple
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Add project root to sys.path to allow importing internal modules
# This script is located in server/intelligence/script/migrate.py
# project_root should be server/intelligence/
project_root = Path(__file__).parent.parent.absolute()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from sqlalchemy import text, select, Table, Column, String, MetaData, DateTime, func
from sqlalchemy.ext.asyncio import AsyncConnection

from core.database import get_engine
from core.logging import get_logger

logger = get_logger(__name__)

# Define migrations table for SQLAlchemy Core tracking
metadata = MetaData()
migrations_table = Table(
    "_intelligence_migrations",
    metadata,
    Column("version", String(255), primary_key=True),
    Column(
        "applied_at", DateTime(timezone=True), server_default=func.now(), nullable=False
    ),
)


async def create_migrations_table(conn: AsyncConnection) -> None:
    """Create migrations tracking table if it doesn't exist."""
    await conn.execute(
        text("""
        CREATE TABLE IF NOT EXISTS _intelligence_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    )


async def get_applied_migrations(conn: AsyncConnection) -> set:
    """Get list of already applied migrations."""
    result = await conn.execute(select(migrations_table.c.version))
    return {row[0] for row in result.fetchall()}


def get_migration_files(migrations_dir: Path) -> List[Tuple[str, Path]]:
    """Get all .up.sql migration files sorted by version."""
    migrations = []
    if not migrations_dir.exists():
        return []

    for file in migrations_dir.glob("*.up.sql"):
        # Expecting format like 20260115000001_name.up.sql
        parts = file.stem.split("_")
        if parts:
            version = parts[0]
            migrations.append((version, file))

    migrations.sort(key=lambda x: x[0])
    return migrations


async def run_migration(conn: AsyncConnection, version: str, file_path: Path) -> None:
    """Run a single migration file."""
    print(f"  Applying {file_path.name}...", end=" ", flush=True)

    try:
        sql_content = file_path.read_text(encoding="utf-8")

        # Split by semicolon to execute separate statements
        # We need to be careful with blocks (like BEGIN...END),
        # but for simple migrations this works.
        statements = [s.strip() for s in sql_content.split(";") if s.strip()]

        for sql in statements:
            # IMPORTANT: Escape colons for SQLAlchemy text() to prevent them being treated as bind parameters.
            # This is strictly required for PostgreSQL casts like ::jsonb or ::vector.
            escaped_sql = sql.replace(":", "\\:")

            # Execute migration SQL
            await conn.execute(text(escaped_sql))

        # Record migration as applied
        await conn.execute(migrations_table.insert().values(version=version))
        print("OK")
    except Exception as e:
        print("FAILED")
        logger.error(f"Migration {version} failed: {e}")
        raise


async def run_migrations() -> None:
    """Main migration runner."""
    migrations_dir = project_root / "migrations"
    if not migrations_dir.exists():
        print(f"Error: Migrations directory not found at {migrations_dir}")
        sys.exit(1)

    print(f"Database: {os.getenv('DB_URL', 'default')}")
    print(f"Migrations folder: {migrations_dir}")

    engine = get_engine()

    try:
        async with engine.begin() as conn:
            # Create migrations tracking table
            await create_migrations_table(conn)

            # Get applied migrations
            applied = await get_applied_migrations(conn)

            # Get all migration files
            migrations = get_migration_files(migrations_dir)

            # Run pending migrations
            pending = [(v, f) for v, f in migrations if v not in applied]

            if not pending:
                print("✓ Database is up to date.")
                return

            print(f"Found {len(applied)} applied, {len(pending)} pending migrations.")
            for version, file_path in pending:
                await run_migration(conn, version, file_path)

            print(f"\n✓ Successfully applied {len(pending)} migrations!")

    except Exception as e:
        print(f"\n❌ Migration process stopped due to errors.")
        sys.exit(1)


async def rollback_migration(version: str) -> None:
    """Rollback a specific migration."""
    migrations_dir = project_root / "migrations"
    if not migrations_dir.exists():
        print(f"Error: Migrations directory not found at {migrations_dir}")
        sys.exit(1)

    down_files = list(migrations_dir.glob(f"{version}_*.down.sql"))
    if not down_files:
        print(f"Error: No rollback file (.down.sql) found for version {version}")
        sys.exit(1)

    down_file = down_files[0]
    print(f"Rolling back migration {version} ({down_file.name})...")

    engine = get_engine()
    try:
        async with engine.begin() as conn:
            sql = down_file.read_text(encoding="utf-8")

            # Escape colons for SQLAlchemy
            escaped_sql = sql.replace(":", "\\:")

            await conn.execute(text(escaped_sql))
            await conn.execute(
                migrations_table.delete().where(migrations_table.c.version == version)
            )

            print(f"✓ Successfully rolled back migration {version}")
    except Exception as e:
        print(f"\n❌ Rollback failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        if len(sys.argv) < 3:
            print("Usage: python migrate.py rollback <version>")
            sys.exit(1)
        asyncio.run(rollback_migration(sys.argv[2]))
    else:
        asyncio.run(run_migrations())
