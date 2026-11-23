"""Running an AI task the same way everywhere: chosen model + fallbacks,
versioned prompt, structured output, and usage reported back to apps/api
(which logs it in ai_calls and enforces caps; policy AI-07).
"""

import asyncio
import time
from collections.abc import Sequence
from typing import Any

from fastapi import HTTPException, status
from pydantic import BaseModel
from pydantic_ai import Agent

from .prompts import load_prompt
from .registry import get_registry

#: Wait before the one retry after a provider says "too many requests" (HTTP 429).
RATE_LIMIT_RETRY_SECONDS = 6.0


def is_rate_limited(error: BaseException) -> bool:
    """True if the provider refused because of a rate limit (HTTP 429), also when
    every model of a fallback chain refused (an exception group)."""
    if isinstance(error, BaseExceptionGroup):
        return all(is_rate_limited(e) for e in error.exceptions)
    return getattr(error, "status_code", None) == 429


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
    return Agent(
        get_registry().build(task),
        output_type=output_type,
        instructions=load_prompt(task),
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
            # Free-tier keys allow few requests per minute: wait and retry once.
            if not is_rate_limited(error):
                raise
            await asyncio.sleep(RATE_LIMIT_RETRY_SECONDS)
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
