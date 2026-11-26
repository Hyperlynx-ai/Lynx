"""FastAPI app for services/ai. Internal: only apps/api calls it."""

from typing import Annotated, Literal

from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field
from pydantic_ai import Agent

from . import __version__
from .cv_edit import router as cv_edit_router
from .cv_routes import router as cv_router
from .facts_routes import router as facts_router
from .security import require_service_token
from .settings import get_settings
from .tasks import Usage, make_agent, run_task

app = FastAPI(
    title="Hyperlynx AI service",
    version=__version__,
    docs_url=None,
    redoc_url=None,
)
app.include_router(cv_router)
app.include_router(cv_edit_router)
app.include_router(facts_router)


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
    output: str
    usage: Usage


def get_ping_agent() -> Agent[None, str]:
    """The agent for the `ping` task. Tests replace it via dependency overrides."""
    return make_agent("ping", str)


@app.post("/v1/ping", dependencies=[Depends(require_service_token)])
async def ping(
    body: PingRequest,
    agent: Annotated[Agent[None, str], Depends(get_ping_agent)],
) -> PingResponse:
    """Smoke test for the whole AI chain: registry -> provider -> model."""
    output, usage = await run_task("ping", agent, body.message)
    return PingResponse(output=output, usage=usage)
