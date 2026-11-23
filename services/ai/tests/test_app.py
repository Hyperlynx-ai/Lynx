from fastapi.testclient import TestClient
from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel

from lynx_ai.app import app, get_ping_agent


def test_health_is_public(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["service"] == "ai"


def test_ping_requires_service_token(client: TestClient) -> None:
    assert client.post("/v1/ping", json={}).status_code == 401
    wrong = {"Authorization": "Bearer nope"}
    assert client.post("/v1/ping", json={}, headers=wrong).status_code == 401


def test_ping_runs_the_configured_agent(client: TestClient, auth_headers: dict[str, str]) -> None:
    # Never call a real provider in tests (policy TEST-03).
    app.dependency_overrides[get_ping_agent] = lambda: Agent(
        TestModel(custom_output_text="Hello from a test model.")
    )

    res = client.post("/v1/ping", json={"message": "hi"}, headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    assert body["output"] == "Hello from a test model."
    usage = body["usage"]
    assert usage["task"] == "ping"
    assert usage["model"]  # the model that answered is reported
    assert usage["input_tokens"] >= 0 and usage["output_tokens"] >= 0
    assert usage["latency_ms"] >= 0
