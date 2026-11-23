import pytest
from fastapi import HTTPException
from pydantic_ai import Agent
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from lynx_ai import tasks
from lynx_ai.tasks import is_rate_limited, run_task


def _flaky(failures: list[int]) -> Agent[None, str]:
    """Fails with the given HTTP statuses first, then answers."""

    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        if failures:
            raise ModelHTTPError(failures.pop(0), "test-model")
        return ModelResponse(parts=[TextPart("done")])

    return Agent(FunctionModel(respond))


async def test_retries_once_after_a_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(tasks, "RATE_LIMIT_RETRY_SECONDS", 0)
    output, usage = await run_task("ping", _flaky([429]), "hi")
    assert output == "done"
    assert usage.task == "ping"


async def test_gives_up_after_a_second_rate_limit_or_other_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(tasks, "RATE_LIMIT_RETRY_SECONDS", 0)
    with pytest.raises(HTTPException):
        await run_task("ping", _flaky([429, 429]), "hi")
    with pytest.raises(HTTPException):
        await run_task("ping", _flaky([500]), "hi")


def test_recognises_rate_limits_in_fallback_groups() -> None:
    limit = ModelHTTPError(429, "a")
    assert is_rate_limited(limit)
    assert is_rate_limited(ExceptionGroup("all", [limit, ModelHTTPError(429, "b")]))
    assert not is_rate_limited(ExceptionGroup("mixed", [limit, ModelHTTPError(503, "b")]))
