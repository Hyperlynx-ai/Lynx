from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from lynx_ai.app import app
from lynx_ai.registry import get_registry
from lynx_ai.settings import get_settings

TEST_TOKEN = "test-service-token"


@pytest.fixture(autouse=True)
def _isolated_settings(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Each test gets fresh settings with a known service token and no real API keys."""
    monkeypatch.setenv("AI_SERVICE_TOKEN", TEST_TOKEN)
    for key in ("GOOGLE_API_KEY", "GEMINI_API_KEY", "NVIDIA_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    get_settings.cache_clear()
    get_registry.cache_clear()
    yield
    app.dependency_overrides.clear()
    get_settings.cache_clear()
    get_registry.cache_clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {TEST_TOKEN}"}
