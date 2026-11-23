import json
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart, UserPromptPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from lynx_ai.app import app
from lynx_ai.cv_edit import get_cv_edit_agent_factory, output_model

SAMPLE: dict[str, Any] = json.loads(
    (Path(__file__).resolve().parents[3] / "packages/shared/fixtures/cv-sample.json").read_text(
        encoding="utf-8"
    )
)


def _factory(content: Any, seen: list[ModelMessage]):
    def factory(section: str) -> Agent[None, Any]:
        def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
            seen.extend(messages)
            args = {"content": content, "explanation": "Tightened the wording."}
            return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, args)])

        return Agent(FunctionModel(respond), output_type=output_model(section))

    return factory


def test_cv_edit_returns_the_edited_section(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    seen: list[ModelMessage] = []
    new_summary = "Backend engineer building payment and logistics APIs in Python and Go."
    app.dependency_overrides[get_cv_edit_agent_factory] = lambda: _factory(new_summary, seen)

    res = client.post(
        "/v1/cv/edit",
        json={
            "section": "summary",
            "content": SAMPLE["basics"]["summary"],
            "instruction": "Make it shorter",
            "target_role": "Backend Engineer",
            "cv": SAMPLE,
        },
        headers=auth_headers,
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["content"] == new_summary
    assert body["explanation"] == "Tightened the wording."
    assert body["usage"]["task"] == "cv_edit"
    prompt = next(p for m in seen for p in m.parts if isinstance(p, UserPromptPart)).content
    assert "Make it shorter" in str(prompt) and "Target role: Backend Engineer" in str(prompt)


def test_cv_edit_keeps_list_sections_structured(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    experience = SAMPLE["experience"]
    app.dependency_overrides[get_cv_edit_agent_factory] = lambda: _factory(experience, [])
    res = client.post(
        "/v1/cv/edit",
        json={"section": "experience", "content": experience, "instruction": "Stronger verbs"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["content"] == experience


def test_cv_edit_rejects_content_of_the_wrong_shape(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    app.dependency_overrides[get_cv_edit_agent_factory] = lambda: _factory([], [])
    res = client.post(
        "/v1/cv/edit",
        json={"section": "experience", "content": "not a list", "instruction": "Improve"},
        headers=auth_headers,
    )
    assert res.status_code == 422
    assert client.post("/v1/cv/edit", json={}).status_code == 401
