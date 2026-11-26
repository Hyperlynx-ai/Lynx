import os
from collections.abc import Mapping
from typing import Any

import pytest

from lynx_ai.jobs.normalize import Job, RawJob
from lynx_ai.jobs.pipeline import run_source
from lynx_ai.jobs.sources import FetchResult


class MemoryStore:
    """In-memory JobStore for pipeline tests (no database)."""

    def __init__(self) -> None:
        self.jobs: dict[str, Job] = {}
        self.runs: list[dict[str, Any]] = []
        self.expire_calls = 0

    def source(self, source_id: str) -> dict[str, Any] | None:
        return {"id": source_id, "enabled": True, "config": {"page": 1}}

    def requested_sources(self) -> list[str]:
        return []

    def enabled_sources(self) -> list[str]:
        return []

    def start_run(self, source_id: str) -> int:
        self.runs.append({"source": source_id})
        return len(self.runs)

    def upsert(self, source_id: str, jobs: list[Job]) -> tuple[int, int]:
        new = sum(1 for j in jobs if j.external_id not in self.jobs)
        self.jobs.update({j.external_id: j for j in jobs})
        return new, len(jobs) - new

    def expire_unseen(self, source_id: str, run_id: int) -> int:
        self.expire_calls += 1
        return 0

    def finish_run(
        self, run_id: int, source_id: str, status: str, counts: dict[str, int], error: str | None
    ) -> None:
        self.runs[run_id - 1].update(status=status, error=error, **counts)

    def housekeeping(self) -> dict[str, int]:
        return {}


def posting(external_id: str, title: str, location: str, company: str = "Acme") -> RawJob:
    return RawJob(external_id, f"https://example.test/{external_id}", title, company, location)


def postings() -> list[RawJob]:
    return [
        posting("1", "Backend Engineer", "Berlin, Germany"),
        posting("2", "Nurse", "Lagos, Nigeria"),  # out of scope
        posting("1", "Backend Engineer", "Berlin, Germany"),  # repeated by the source
    ]


def test_a_run_normalizes_filters_stores_and_expires() -> None:
    store = MemoryStore()
    seen: list[Mapping[str, Any]] = []

    def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
        seen.append(config)
        return FetchResult(postings())

    summary = run_source("demo", store, {"demo": fetch}, env={})

    assert (summary.status, summary.fetched, summary.kept, summary.inserted) == ("ok", 3, 1, 1)
    assert seen == [{"page": 1}]
    assert store.expire_calls == 1
    assert store.runs[0]["status"] == "ok"


def test_a_partial_fetch_never_expires_jobs() -> None:
    store = MemoryStore()

    def partial(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
        return FetchResult(postings(), complete=False)

    summary = run_source("demo", store, {"demo": partial}, env={})
    assert summary.status == "partial"
    assert store.expire_calls == 0


def test_a_failing_source_is_recorded_without_secrets() -> None:
    store = MemoryStore()

    def broken(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
        raise RuntimeError("GET https://api.example.test/jobs?app_key=SECRET123 failed")

    summary = run_source("demo", store, {"demo": broken}, env={})

    assert summary.status == "failed"
    assert summary.error is not None and "SECRET123" not in summary.error
    assert store.runs[0]["status"] == "failed"


def test_sources_without_an_adapter_are_recorded_as_failed() -> None:
    store = MemoryStore()
    summary = run_source("nope", store, {}, env={})
    assert summary.status == "failed"
    assert store.runs[0]["error"] == "LookupError: no adapter for this source yet"


@pytest.mark.skipif(
    os.environ.get("RUN_DB_TESTS") != "1",
    reason="opt-in: start the local database (pnpm db:start), then set RUN_DB_TESTS=1",
)
def test_postgres_store_round_trip() -> None:
    from sqlalchemy import text

    from lynx_ai.db import get_engine
    from lynx_ai.jobs.store import PostgresJobStore

    get_engine.cache_clear()
    engine = get_engine()
    store = PostgresJobStore(engine)
    sources = "('jobicy', 'himalayas')"

    def cleanup() -> None:
        with engine.begin() as conn:
            conn.execute(text(f"delete from public.jobs where source_id in {sources}"))
            conn.execute(text(f"delete from public.job_runs where source_id in {sources}"))
            conn.execute(
                text(
                    "update public.job_sources set last_run_at = null, last_status = null,"
                    f" last_error = null, active_jobs = 0 where id in {sources}"
                )
            )

    def returns(*jobs: RawJob):
        return lambda config, env: FetchResult(list(jobs))

    cleanup()
    try:
        backend = posting("a", "Backend Engineer", "Berlin")
        assert run_source("jobicy", store, {"jobicy": returns(backend)}, env={}).inserted == 1
        again = run_source("jobicy", store, {"jobicy": returns(backend)}, env={})
        assert (again.inserted, again.updated, again.expired) == (0, 1, 0)

        same_job = posting("z", "Backend Engineer", "Berlin")
        assert (
            run_source("himalayas", store, {"himalayas": returns(same_job)}, env={}).inserted == 1
        )
        assert store.housekeeping()["duplicates_marked"] == 1  # one job, two sources

        chef = posting("b", "Chef", "Dubai", company="Hotel")
        gone = run_source("jobicy", store, {"jobicy": returns(chef)}, env={})
        assert gone.expired == 1  # "a" is no longer listed by jobicy
    finally:
        cleanup()
