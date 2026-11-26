"""Text embeddings for matching (chunk 3.7, ADR 0011).

NVIDIA's hosted nemotron-3.5-embed-1b (multilingual) through its
OpenAI-compatible API, cut to 768 dimensions and stored as `halfvec(768)`.
Jobs are embedded as passages, candidate profiles as queries.

    embed_jobs(engine)   # active jobs without an embedding, within a time budget

Needs NVIDIA_API_KEY. The free tier allows about 40 requests a minute, so
requests are spaced out and 429s are retried.
"""

import contextlib
import os
import time
from collections.abc import Sequence
from typing import Literal

import httpx
from sqlalchemy import Engine, text

URL = "https://integrate.api.nvidia.com/v1/embeddings"
MODEL = "nvidia/nemotron-3.5-embed-1b"
DIMENSIONS = 768
#: Texts per request, and seconds between requests (about 40 a minute).
BATCH = 50
REQUEST_GAP = 1.6
#: Characters of description that go into a job's embedding.
DESCRIPTION_CHARS = 1500


class EmbeddingError(RuntimeError):
    pass


def embed(
    texts: Sequence[str],
    input_type: Literal["query", "passage"],
    http: httpx.Client | None = None,
    api_key: str | None = None,
) -> list[list[float]]:
    """Embeddings for `texts`, in order. Raises EmbeddingError (without the key)."""
    key = api_key or os.environ.get("NVIDIA_API_KEY")
    if not key:
        raise EmbeddingError("NVIDIA_API_KEY is not set")
    client = http or httpx.Client(timeout=60)
    try:
        for attempt in range(4):
            response = client.post(
                URL,
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": MODEL,
                    "input": list(texts),
                    "input_type": input_type,
                    "dimensions": DIMENSIONS,
                    "encoding_format": "float",
                    "truncate": "END",
                },
            )
            if response.status_code == 429 or response.status_code >= 500:
                time.sleep(10 * (attempt + 1))
                continue
            if response.status_code != 200:
                raise EmbeddingError(f"embedding request failed: HTTP {response.status_code}")
            data = sorted(response.json()["data"], key=lambda d: d["index"])
            return [d["embedding"] for d in data]
        raise EmbeddingError("embedding service busy (retries used up)")
    finally:
        if http is None:
            client.close()


def to_pgvector(values: Sequence[float]) -> str:
    """The text form pgvector reads: '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{v:.6g}" for v in values) + "]"


def job_text(row: dict) -> str:
    parts = [
        row.get("title"),
        row.get("company"),
        row.get("location"),
        (row.get("field") or "").replace("_", " "),
        (row.get("description") or "")[:DESCRIPTION_CHARS],
    ]
    return "\n".join(p for p in parts if p)


def embed_jobs(engine: Engine, budget_s: float = 1200, limit: int = 20_000) -> int:
    """Embeds visible jobs that have no embedding yet, newest first. Returns how many."""
    with engine.connect() as conn:
        rows = [
            dict(r)
            for r in conn.execute(
                text(
                    "select id, title, company, location, field, left(description, :chars)"
                    " as description from public.jobs where status = 'active'"
                    " and duplicate_of is null and embedding is null"
                    " order by first_seen_at desc limit :limit"
                ),
                {"chars": DESCRIPTION_CHARS, "limit": limit},
            ).mappings()
        ]
    done = 0
    failed_batches = 0
    started = time.monotonic()
    with httpx.Client(timeout=60) as http:
        for i in range(0, len(rows), BATCH):
            if time.monotonic() - started > budget_s:
                break  # the next run carries on
            batch = rows[i : i + BATCH]
            pairs = _embed_batch(batch, http)
            if not pairs:
                failed_batches += 1
                if failed_batches >= 5:
                    raise EmbeddingError("embedding keeps failing; stopped")
                continue
            failed_batches = 0
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "update public.jobs set embedding = cast(:e as extensions.halfvec)"
                        " where id = :id"
                    ),
                    [{"id": r["id"], "e": to_pgvector(v)} for r, v in pairs],
                )
            done += len(pairs)
            time.sleep(REQUEST_GAP)
    return done


def _embed_batch(batch: list[dict], http: httpx.Client) -> list[tuple[dict, list[float]]]:
    """Embeds a batch; if the service rejects it, retries once, then job by job
    (a job it still rejects is skipped and tried again next run)."""
    texts = [job_text(r) for r in batch]
    for _ in range(2):
        try:
            return list(zip(batch, embed(texts, "passage", http), strict=True))
        except EmbeddingError:
            time.sleep(REQUEST_GAP * 3)
    pairs = []
    for row, text_ in zip(batch, texts, strict=True):
        with contextlib.suppress(EmbeddingError):
            pairs.append((row, embed([text_], "passage", http)[0]))
        time.sleep(REQUEST_GAP)
    return pairs
