"""Facts tasks: POST /v1/facts/extract (free text -> facts about the candidate)."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from pydantic_ai import Agent

from .security import require_service_token
from .tasks import Usage, make_agent, run_task

router = APIRouter(prefix="/v1/facts", dependencies=[Depends(require_service_token)])

# Same values as packages/shared/src/facts.ts and the lynx_facts table.
FactCategory = Literal[
    "summary",
    "experience",
    "education",
    "skill",
    "project",
    "certification",
    "language",
    "achievement",
    "preference",
    "goal",
    "personal",
    "other",
]


class Fact(BaseModel):
    category: FactCategory
    text: str = Field(max_length=300, description="One short sentence, third person")


class ExtractedFacts(BaseModel):
    facts: list[Fact] = Field(default_factory=list, max_length=20)


class FactsExtractRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class FactsExtractResponse(BaseModel):
    facts: list[Fact]
    usage: Usage


def get_facts_extract_agent() -> Agent[None, ExtractedFacts]:
    return make_agent("facts_extract", ExtractedFacts)


@router.post("/extract")
async def facts_extract(
    body: FactsExtractRequest,
    agent: Annotated[Agent[None, ExtractedFacts], Depends(get_facts_extract_agent)],
) -> FactsExtractResponse:
    extracted, usage = await run_task(
        "facts_extract", agent, f"What the candidate wrote:\n\n{body.text}"
    )
    return FactsExtractResponse(facts=extracted.facts[:20], usage=usage)
