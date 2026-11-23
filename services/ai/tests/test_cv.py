import io
import json
from pathlib import Path
from typing import Any

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic_ai import Agent, BinaryContent
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart, UserPromptPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from lynx_ai.app import app
from lynx_ai.cv import CvData, ParsedCv
from lynx_ai.cv_routes import get_cv_parse_agent, get_file_fetcher
from lynx_ai.files import DOCX, MAX_FILE_BYTES, PDF, check_file_url, docx_to_text, download

REPO = Path(__file__).resolve().parents[3]
SAMPLE: dict[str, Any] = json.loads(
    (REPO / "packages" / "shared" / "fixtures" / "cv-sample.json").read_text(encoding="utf-8")
)
SIGNED = "https://abc.supabase.co/storage/v1/object/sign/cvs/u1/cv.pdf?token=t"


def test_cv_schema_matches_the_shared_sample() -> None:
    # The same sample is checked against the zod mirror in packages/shared.
    # A round trip catches fields missing on either side.
    assert CvData.model_validate(SAMPLE).model_dump(mode="json") == SAMPLE


@pytest.mark.parametrize(
    ("url", "allow_local", "ok"),
    [
        (SIGNED, False, True),
        ("http://127.0.0.1:54321/storage/v1/object/sign/cvs/u1/cv.pdf?token=t", True, True),
        ("http://127.0.0.1:54321/storage/v1/object/sign/cvs/u1/cv.pdf?token=t", False, False),
        ("https://abc.supabase.co/storage/v1/object/public/cvs/u1/cv.pdf", False, False),
        ("https://evil.example/storage/v1/object/sign/x", False, False),
        ("https://abc.supabase.co.evil.example/storage/v1/object/sign/x", False, False),
        ("http://abc.supabase.co/storage/v1/object/sign/x", False, False),
        ("file:///etc/passwd", True, False),
    ],
)
def test_only_signed_storage_urls_are_fetched(url: str, allow_local: bool, ok: bool) -> None:
    if ok:
        check_file_url(url, allow_local=allow_local)
    else:
        with pytest.raises(HTTPException):
            check_file_url(url, allow_local=allow_local)


async def test_download_refuses_files_over_the_limit() -> None:
    big = httpx.MockTransport(lambda _: httpx.Response(200, content=b"x" * (MAX_FILE_BYTES + 1)))
    async with httpx.AsyncClient(transport=big) as client:
        with pytest.raises(HTTPException) as error:
            await download(SIGNED, allow_local=False, client=client)
    assert error.value.status_code == 413

    small = httpx.MockTransport(lambda _: httpx.Response(200, content=b"%PDF-1.7"))
    async with httpx.AsyncClient(transport=small) as client:
        assert await download(SIGNED, allow_local=False, client=client) == b"%PDF-1.7"


def test_docx_text_includes_paragraphs_and_tables() -> None:
    from docx import Document

    document = Document()
    document.add_paragraph("Meera Nair")
    document.add_paragraph("Staff Nurse")
    table = document.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Skills"
    table.rows[0].cells[1].text = "ICU care, BLS"
    buffer = io.BytesIO()
    document.save(buffer)

    text = docx_to_text(buffer.getvalue())

    assert "Meera Nair" in text
    assert "Skills | ICU care, BLS" in text


def _agent_returning(output: dict[str, Any], seen: list[ModelMessage]) -> Agent[None, ParsedCv]:
    """A fake model (no real provider, TEST-03) that records what it was sent."""

    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        seen.extend(messages)
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, output)])

    return Agent(FunctionModel(respond), output_type=ParsedCv)


def _user_content(seen: list[ModelMessage]) -> list[Any]:
    parts = [p for m in seen for p in m.parts if isinstance(p, UserPromptPart)]
    content = parts[0].content
    return [content] if isinstance(content, str) else list(content)


def _use(agent: Agent[None, ParsedCv], file_bytes: bytes) -> None:
    async def fetch(_: str) -> bytes:
        return file_bytes

    app.dependency_overrides[get_cv_parse_agent] = lambda: agent
    app.dependency_overrides[get_file_fetcher] = lambda: fetch


def test_cv_parse_sends_pdfs_to_the_model_as_files(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    seen: list[ModelMessage] = []
    _use(_agent_returning({"is_cv": True, "cv": SAMPLE}, seen), b"%PDF-1.7 fake")

    res = client.post(
        "/v1/cv/parse", json={"file_url": SIGNED, "media_type": PDF}, headers=auth_headers
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["is_cv"] is True
    assert body["cv"] == SAMPLE
    assert body["usage"]["task"] == "cv_parse"
    files = [c for c in _user_content(seen) if isinstance(c, BinaryContent)]
    assert files and files[0].media_type == PDF


def test_cv_parse_sends_docx_as_text(client: TestClient, auth_headers: dict[str, str]) -> None:
    from docx import Document

    document = Document()
    document.add_paragraph("Meera Nair, Staff Nurse")
    buffer = io.BytesIO()
    document.save(buffer)
    seen: list[ModelMessage] = []
    _use(_agent_returning({"is_cv": True, "cv": SAMPLE}, seen), buffer.getvalue())

    res = client.post(
        "/v1/cv/parse", json={"file_url": SIGNED, "media_type": DOCX}, headers=auth_headers
    )

    assert res.status_code == 200, res.text
    content = _user_content(seen)
    assert any(isinstance(c, str) and "Meera Nair, Staff Nurse" in c for c in content)
    assert not any(isinstance(c, BinaryContent) for c in content)


def test_cv_parse_returns_an_empty_cv_for_other_documents(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    _use(_agent_returning({"is_cv": False, "cv": SAMPLE}, []), b"%PDF-1.7 invoice")

    res = client.post(
        "/v1/cv/parse", json={"file_url": SIGNED, "media_type": PDF}, headers=auth_headers
    )

    assert res.status_code == 200
    assert res.json()["is_cv"] is False
    assert res.json()["cv"] == CvData().model_dump(mode="json")


def test_cv_parse_needs_the_service_token_and_a_supported_type(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    _use(_agent_returning({"is_cv": True, "cv": SAMPLE}, []), b"%PDF-1.7")
    body = {"file_url": SIGNED, "media_type": PDF}
    assert client.post("/v1/cv/parse", json=body).status_code == 401
    other = {"file_url": SIGNED, "media_type": "image/png"}
    assert client.post("/v1/cv/parse", json=other, headers=auth_headers).status_code == 422
