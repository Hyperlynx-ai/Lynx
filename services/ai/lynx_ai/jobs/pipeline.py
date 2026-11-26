"""One ingestion run for one source: fetch, normalize, store, expire."""

import os
from collections.abc import Mapping
from dataclasses import dataclass

from .normalize import normalize
from .sources import ADAPTERS, Fetch
from .store import JobStore


@dataclass
class RunSummary:
    source: str
    status: str
    fetched: int = 0
    kept: int = 0
    inserted: int = 0
    updated: int = 0
    expired: int = 0
    error: str | None = None


def _safe_error(error: BaseException) -> str:
    """A short error for logs and the admin console (no URLs: they may hold keys)."""
    message = str(error).split("?")[0].replace("\n", " ")
    return f"{type(error).__name__}: {message}"[:300]


def run_source(
    source_id: str,
    store: JobStore,
    adapters: Mapping[str, Fetch] = ADAPTERS,
    env: Mapping[str, str] | None = None,
) -> RunSummary:
    source = store.source(source_id)
    if source is None:
        return RunSummary(source_id, "failed", error="unknown source")
    fetch = adapters.get(source_id)
    run_id = store.start_run(source_id)  # also clears an admin's "run now" request
    summary = RunSummary(source_id, "ok")
    try:
        if fetch is None:
            raise LookupError("no adapter for this source yet")
        result = fetch(source.get("config") or {}, env if env is not None else os.environ)
        summary.fetched = len(result.jobs)
        jobs = {}
        for raw in result.jobs:
            job = normalize(raw)
            if job is not None:
                jobs[job.external_id] = job
        summary.kept = len(jobs)
        summary.inserted, summary.updated = store.upsert(source_id, list(jobs.values()))
        if result.complete and summary.fetched > 0:
            summary.expired = store.expire_unseen(source_id, run_id)
        else:
            summary.status = "partial"
            summary.error = result.note
    except Exception as error:  # a failing source must not stop the others
        summary.status = "failed"
        summary.error = _safe_error(error)
    counts = {
        "fetched": summary.fetched,
        "kept": summary.kept,
        "inserted": summary.inserted,
        "updated": summary.updated,
        "expired": summary.expired,
    }
    store.finish_run(run_id, source_id, summary.status, counts, summary.error)
    return summary
