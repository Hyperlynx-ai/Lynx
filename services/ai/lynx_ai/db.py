"""Database access for batch jobs (ingestion, embeddings, newsletters).

The schema is defined by SQL migrations in supabase/migrations (policy DB-01);
use SQLAlchemy Core (`sqlalchemy.text` or `Table` reflection), not ORM models
that redefine tables.
"""

from functools import lru_cache

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.pool import NullPool

from .settings import get_settings


@lru_cache
def get_engine() -> Engine:
    url = get_settings().database_url
    if not url:
        raise RuntimeError("DATABASE_URL is not set (see services/ai/.env.example)")
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    # Serverless + Supabase's transaction pooler: no client-side pool, no prepared statements.
    return create_engine(
        url,
        poolclass=NullPool,
        connect_args={"prepare_threshold": None, "connect_timeout": 10},
    )


def ping() -> bool:
    """True if the database answers."""
    with get_engine().connect() as conn:
        return conn.execute(text("select 1")).scalar_one() == 1
