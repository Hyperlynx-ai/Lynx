import os

import pytest

from lynx_ai import db
from lynx_ai.settings import get_settings


def test_missing_database_url_is_a_clear_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_settings.cache_clear()
    db.get_engine.cache_clear()
    with pytest.raises(RuntimeError, match="DATABASE_URL is not set"):
        db.get_engine()


@pytest.mark.skipif(
    os.environ.get("RUN_DB_TESTS") != "1",
    reason="opt-in: start the local database (pnpm db:start), then set RUN_DB_TESTS=1",
)
def test_database_answers() -> None:
    db.get_engine.cache_clear()
    assert db.ping()
