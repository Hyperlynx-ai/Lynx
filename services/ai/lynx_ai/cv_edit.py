"""cv_edit: rewrite one section of a structured CV from an instruction.

The model gets one section (its content as JSON), the instruction, optional
context (target role, the rest of the CV) and returns the same section shape
plus a one-line explanation. apps/api checks the result against the original
CV (no new employers, dates, skills or numbers; policy AI-08) before showing
it as a diff the candidate accepts or rejects.
"""

import json
from functools import cache
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ValidationError, create_model
from pydantic_ai import Agent

from .cv import Basics, Certification, Education, Experience, Language, Project, SkillGroup
from .security import require_service_token
from .tasks import Usage, make_agent, run_task

router = APIRouter(prefix="/v1/cv", dependencies=[Depends(require_service_token)])

Section = Literal[
    "basics",
    "summary",
    "experience",
    "education",
    "projects",
    "skills",
    "certifications",
    "languages",
    "achievements",
]

#: The shape of each section's content (as in CvData).
SECTION_TYPES: dict[str, Any] = {
    "basics": Basics,
    "summary": str | None,
    "experience": list[Experience],
    "education": list[Education],
    "projects": list[Project],
    "skills": list[SkillGroup],
    "certifications": list[Certification],
    "languages": list[Language],
    "achievements": list[str],
}


@cache
def output_model(section: str) -> type[BaseModel]:
    """`{content: <section type>, explanation: str}` for one section."""
    return create_model(
        f"Edited_{section}",
        content=(SECTION_TYPES[section], Field(description=f"The edited `{section}` section")),
        explanation=(
            str,
            Field(max_length=300, description="One sentence: what you changed and why"),
        ),
    )


def get_cv_edit_agent_factory():
    """Returns a function section -> agent. Tests replace it."""

    def factory(section: str) -> Agent[None, Any]:
        return make_agent("cv_edit", output_model(section))

    return factory


class CvEditRequest(BaseModel):
    section: Section
    content: Any = Field(description="The section's current content, same shape as in CvData")
    instruction: str = Field(min_length=3, max_length=500)
    target_role: str | None = Field(default=None, max_length=120)
    #: The whole CV for context (read-only for the model).
    cv: dict[str, Any] | None = None


class CvEditResponse(BaseModel):
    section: Section
    content: Any
    explanation: str
    usage: Usage


def build_prompt(body: CvEditRequest) -> str:
    parts = [
        f"Section to edit: {body.section}",
        f"Instruction from the candidate: {body.instruction}",
    ]
    if body.target_role:
        parts.append(f"Target role: {body.target_role}")
    if body.cv is not None:
        parts.append("The whole CV, for context only (do not copy new facts into the section):")
        parts.append(json.dumps(body.cv, ensure_ascii=False)[:20_000])
    parts.append("Current content of the section:")
    parts.append(json.dumps(body.content, ensure_ascii=False)[:20_000])
    return "\n\n".join(parts)


@router.post("/edit")
async def cv_edit(
    body: CvEditRequest,
    factory: Annotated[Any, Depends(get_cv_edit_agent_factory)],
) -> CvEditResponse:
    agent = factory(body.section)
    # Validate the input against the section's shape (422 on mismatch).
    try:
        current = output_model(body.section).model_validate(
            {"content": body.content, "explanation": "-"}
        )
    except ValidationError as error:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"content doesn't match the {body.section} section",
        ) from error
    body.content = current.model_dump(mode="json")["content"]
    edited, usage = await run_task("cv_edit", agent, build_prompt(body))
    data = edited.model_dump(mode="json")
    return CvEditResponse(
        section=body.section,
        content=data["content"],
        explanation=data["explanation"],
        usage=usage,
    )
