"""CV tasks: POST /v1/cv/parse (file -> structured CV)."""

from collections.abc import Awaitable, Callable, Sequence
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from pydantic_ai import Agent, BinaryContent
from pydantic_ai.messages import UserContent

from .cv import CvData, ParsedCv
from .files import DOCX, PDF, docx_to_text, download, pdf_to_text
from .registry import COMPAT_PREFIX, get_registry
from .security import require_service_token
from .settings import get_settings
from .tasks import Usage, make_agent, run_task

router = APIRouter(prefix="/v1/cv", dependencies=[Depends(require_service_token)])

#: Long CVs are cut here before reaching the model (about 15k tokens).
MAX_TEXT_CHARS = 60_000

FileFetcher = Callable[[str], Awaitable[bytes]]


class CvParseRequest(BaseModel):
    file_url: str = Field(max_length=4096, description="Signed URL of the file in Storage")
    media_type: Literal[
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]


class CvParseResponse(BaseModel):
    is_cv: bool
    cv: CvData
    usage: Usage


def get_cv_parse_agent() -> Agent[None, ParsedCv]:
    return make_agent("cv_parse", ParsedCv)


def get_file_fetcher() -> FileFetcher:
    """Downloads files; the local Supabase stack is allowed only outside Vercel."""
    allow_local = get_settings().vercel_env is None

    async def fetch(url: str) -> bytes:
        return await download(url, allow_local=allow_local)

    return fetch


def model_reads_pdf(task: str) -> bool:
    """OpenAI-compatible endpoints often can't take files, so they get text."""
    return not get_registry().resolve(task).model.startswith(COMPAT_PREFIX)


def cv_parse_input(data: bytes, media_type: str, *, native_pdf: bool) -> Sequence[UserContent]:
    """What the model gets: the PDF itself, or the document's text."""
    if media_type == PDF and native_pdf:
        return ["The candidate's CV is attached.", BinaryContent(data=data, media_type=PDF)]
    text = docx_to_text(data) if media_type == DOCX else pdf_to_text(data)
    if not text:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "No text found in the file")
    return [f"The candidate's CV, as plain text:\n\n{text[:MAX_TEXT_CHARS]}"]


@router.post("/parse")
async def cv_parse(
    body: CvParseRequest,
    agent: Annotated[Agent[None, ParsedCv], Depends(get_cv_parse_agent)],
    fetch: Annotated[FileFetcher, Depends(get_file_fetcher)],
) -> CvParseResponse:
    data = await fetch(body.file_url)
    user_input = cv_parse_input(data, body.media_type, native_pdf=model_reads_pdf("cv_parse"))
    parsed, usage = await run_task("cv_parse", agent, user_input)
    return CvParseResponse(
        is_cv=parsed.is_cv, cv=parsed.cv if parsed.is_cv else CvData(), usage=usage
    )
