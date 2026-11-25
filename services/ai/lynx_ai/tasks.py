"""Running an AI task the same way everywhere: chosen model + fallbacks,
versioned prompt, structured output, and usage reported back to apps/api
(which logs it in ai_calls and enforces caps; policy AI-07).
"""

import asyncio
import re
import time
from collections.abc import Sequence
from typing import Any

from fastapi import HTTPException, status
from pydantic import BaseModel
from pydantic_ai import Agent

from .prompts import load_prompt
from .registry import get_registry

#: Wait before the one retry after a brief provider problem.
RETRY_SECONDS = 4.0
#: A refusal that asks to wait longer than this (e.g. a daily quota) isn't retried.
MAX_RETRY_DELAY_SECONDS = 60.0

_RETRY_DELAY = re.compile(r"retryDelay['\"]?\s*:\s*['\"](\d+(?:\.\d+)?)s")


def is_transient(error: BaseException) -> bool:
    """True for problems worth one retry: the provider is overloaded (503) or
    asks to slow down for a short while (429 with a short or no retry delay).
    A used-up daily quota (429 asking to wait hours) is not. For a fallback
    chain (an exception group), true if any model's problem was transient."""
    if isinstance(error, BaseExceptionGroup):
        return any(is_transient(e) for e in error.exceptions)
    status_code = getattr(error, "status_code", None)
    if status_code == 503:
        return True
    if status_code != 429:
        return False
    match = _RETRY_DELAY.search(str(getattr(error, "body", "")))
    return match is None or float(match.group(1)) <= MAX_RETRY_DELAY_SECONDS


class Usage(BaseModel):
    """What a call cost. Never contains personal data."""

    task: str
    model: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    cost_usd: float | None


def make_agent[T](task: str, output_type: type[T]) -> Agent[None, T]:
    """An agent for `task` with its model from models.yaml and its prompt file."""
    timeout = get_registry().resolve(task).timeout_s
    return Agent(
        get_registry().build(task),
        output_type=output_type,
        instructions=load_prompt(task),
        model_settings={"timeout": timeout} if timeout else None,
    )


async def run_task[T](
    task: str, agent: Agent[None, T], user_input: str | Sequence[Any]
) -> tuple[T, Usage]:
    """Runs the agent and measures it. Provider errors become a 502 without details."""
    started = time.perf_counter()
    try:
        try:
            result = await agent.run(user_input)
        except Exception as error:
            # Free-tier models are often briefly overloaded: wait and retry once.
            if not is_transient(error):
                raise
            await asyncio.sleep(RETRY_SECONDS)
            result = await agent.run(user_input)
    except Exception as error:  # never leak provider errors (they may echo input)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The AI provider failed") from error
    latency_ms = int((time.perf_counter() - started) * 1000)
    usage = result.usage
    model = result.response.model_name or get_registry().resolve(task).model
    input_tokens = int(usage.input_tokens or 0)
    output_tokens = int(usage.output_tokens or 0)
    return result.output, Usage(
        task=task,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=latency_ms,
        cost_usd=get_registry().estimate_cost(model, input_tokens, output_tokens),
    )
