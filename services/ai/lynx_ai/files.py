"""Reading candidate files: download from a signed Supabase Storage URL, and
turn DOCX (or PDF, when the model can't read PDFs) into plain text.

The service only downloads from Supabase Storage signed URLs, so a request
can't make it fetch anything else (SSRF), even with a valid service token.
"""

import io
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException, status

PDF = "application/pdf"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
MAX_FILE_BYTES = 10 * 1024 * 1024  # same limit as the cvs bucket
SIGNED_PATH_PREFIX = "/storage/v1/object/sign/"
LOCAL_HOSTS = {"127.0.0.1", "localhost"}


def check_file_url(url: str, *, allow_local: bool) -> None:
    """Accepts only Supabase Storage signed URLs (and the local stack in development)."""
    parts = urlsplit(url)
    host = parts.hostname or ""
    hosted = parts.scheme == "https" and host.endswith(".supabase.co")
    local = allow_local and parts.scheme == "http" and host in LOCAL_HOSTS
    if not (hosted or local) or not parts.path.startswith(SIGNED_PATH_PREFIX):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "file_url must be a signed storage URL")


async def download(
    url: str, *, allow_local: bool, client: httpx.AsyncClient | None = None
) -> bytes:
    """Downloads the file, refusing anything over MAX_FILE_BYTES."""
    check_file_url(url, allow_local=allow_local)
    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=30, follow_redirects=False)
    try:
        async with client.stream("GET", url) as res:
            if res.status_code != 200:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Couldn't download the file")
            chunks: list[bytes] = []
            size = 0
            async for chunk in res.aiter_bytes():
                size += len(chunk)
                if size > MAX_FILE_BYTES:
                    raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "File is too large")
                chunks.append(chunk)
            return b"".join(chunks)
    except httpx.HTTPError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Couldn't download the file") from error
    finally:
        if owns_client:
            await client.aclose()


def docx_to_text(data: bytes) -> str:
    """Paragraphs and table rows of a DOCX, in document order (tables are
    common in Word CV templates, e.g. for contact details or skills)."""
    from docx import Document
    from docx.table import Table

    try:
        document = Document(io.BytesIO(data))
    except Exception as error:  # not a valid DOCX
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unreadable DOCX") from error
    lines: list[str] = []
    for block in document.iter_inner_content():
        if not isinstance(block, Table):
            lines.append(block.text)
            continue
        for row in block.rows:
            cells: list[str] = []
            for cell in row.cells:
                text = cell.text.strip()
                if text and text not in cells:  # merged cells repeat their text
                    cells.append(text)
            lines.append(" | ".join(cells))
    return "\n".join(line.strip() for line in lines if line.strip())


def pdf_to_text(data: bytes) -> str:
    """Text layer of a PDF (empty for scanned PDFs)."""
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
        return "\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()
    except Exception as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unreadable PDF") from error
