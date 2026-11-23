from typing import Any

from fastapi.testclient import TestClient
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from lynx_ai.app import app
from lynx_ai.facts_routes import ExtractedFacts, get_facts_extract_agent


def _agent(output: dict[str, Any]) -> Agent[None, ExtractedFacts]:
    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, output)])

    return Agent(FunctionModel(respond), output_type=ExtractedFacts)


def test_facts_extract_returns_facts_and_usage(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    facts = [
        {"category": "goal", "text": "Wants to move to Dubai within 6 months"},
        {"category": "preference", "text": "Prefers night shifts"},
    ]
    app.dependency_overrides[get_facts_extract_agent] = lambda: _agent({"facts": facts})

    res = client.post(
        "/v1/facts/extract",
        json={"text": "I want to move to Dubai within 6 months. I prefer night shifts."},
        headers=auth_headers,
    )

    assert res.status_code == 200, res.text
    assert res.json()["facts"] == facts
    assert res.json()["usage"]["task"] == "facts_extract"


def test_facts_extract_needs_the_token_and_limits_input(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    app.dependency_overrides[get_facts_extract_agent] = lambda: _agent({"facts": []})
    assert client.post("/v1/facts/extract", json={"text": "hi"}).status_code == 401
    too_long = {"text": "x" * 2001}
    assert client.post("/v1/facts/extract", json=too_long, headers=auth_headers).status_code == 422
