"""FastAPI app for services/ai. Internal: only apps/api calls it."""

from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from pydantic_ai import Agent

from . import __version__
from .prompts import load_prompt
from .registry import get_registry
from .security import require_service_token
from .settings import get_settings

app = FastAPI(
    title="Hyperlynx AI service",
    version=__version__,
    docs_url=None,
    redoc_url=None,
)


class Health(BaseModel):
    status: Literal["ok"]
    service: Literal["ai"]
    version: str
    environment: str


@app.get("/health")
def health() -> Health:
    """Liveness check. Public: returns no data."""
    return Health(
        status="ok",
        service="ai",
        version=__version__,
        environment=get_settings().vercel_env or "development",
    )


class PingRequest(BaseModel):
    message: str = Field(
        default="Say hello to the Hyperlynx team in one short sentence.", max_length=500
    )


class PingResponse(BaseModel):
    task: Literal["ping"]
    model: str
    output: str


def get_ping_agent() -> Agent[None, str]:
    """The agent for the `ping` task. Tests replace it via dependency overrides."""
    return Agent(get_registry().build("ping"), instructions=load_prompt("ping"))


@app.post("/v1/ping", dependencies=[Depends(require_service_token)])
async def ping(
    body: PingRequest,
    agent: Annotated[Agent[None, str], Depends(get_ping_agent)],
) -> PingResponse:
    """Smoke test for the whole AI chain: registry -> provider -> model."""
    try:
        result = await agent.run(body.message)
    except Exception as error:  # provider errors must not leak details to callers
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The AI provider failed") from error
    return PingResponse(
        task="ping", model=get_registry().resolve("ping").model, output=result.output
    )
