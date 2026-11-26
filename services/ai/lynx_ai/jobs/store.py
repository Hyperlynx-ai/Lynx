"""Writing jobs to Postgres (the ingestion runs as the database owner).

`JobStore` is the interface the pipeline uses; `PostgresJobStore` is the real
one (SQLAlchemy Core, raw SQL against the schema in supabase/migrations).
Tests use an in-memory store.
"""

from dataclasses import asdict
from typing import Any, Protocol

from sqlalchemy import Engine, text

from .normalize import Job

#: A job its source hasn't listed for this many days expires (sources only
#: list open jobs, so an old job that is still listed stays active), and an
#: expired job is deleted after KEEP_EXPIRED_DAYS.
STALE_DAYS = 7
KEEP_EXPIRED_DAYS = 30


class JobStore(Protocol):
    def source(self, source_id: str) -> dict[str, Any] | None: ...
    def requested_sources(self) -> list[str]: ...
    def enabled_sources(self) -> list[str]: ...
    def start_run(self, source_id: str) -> int: ...
    def upsert(self, source_id: str, jobs: list[Job]) -> tuple[int, int]: ...
    def expire_unseen(self, source_id: str, run_id: int) -> int: ...
    def finish_run(
        self, run_id: int, source_id: str, status: str, counts: dict[str, int], error: str | None
    ) -> None: ...
    def housekeeping(self) -> dict[str, int]: ...


_UPSERT = text(
    """
    insert into public.jobs (
      source_id, external_id, url, title, company, location, country, city, remote,
      employment_type, seniority, field, description, salary_text, salary_min, salary_max,
      salary_currency, posted_at, deadline, dedupe_key, last_seen_at, status, expired_at
    ) values (
      :source_id, :external_id, :url, :title, :company, :location, :country, :city, :remote,
      :employment_type, :seniority, :field, :description, :salary_text, :salary_min, :salary_max,
      :salary_currency, :posted_at, :deadline, :dedupe_key, now(), 'active', null
    )
    on conflict (source_id, external_id) do update set
      url = excluded.url, title = excluded.title, company = excluded.company,
      location = excluded.location, country = excluded.country, city = excluded.city,
      remote = excluded.remote, employment_type = excluded.employment_type,
      seniority = excluded.seniority, field = excluded.field,
      description = excluded.description, salary_text = excluded.salary_text,
      salary_min = excluded.salary_min, salary_max = excluded.salary_max,
      salary_currency = excluded.salary_currency,
      posted_at = coalesce(excluded.posted_at, public.jobs.posted_at),
      deadline = excluded.deadline, dedupe_key = excluded.dedupe_key,
      last_seen_at = now(), status = 'active', expired_at = null
    returning (xmax = 0) as inserted
    """
)


class PostgresJobStore:
    def __init__(self, engine: Engine) -> None:
        self.engine = engine

    def source(self, source_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as conn:
            row = (
                conn.execute(
                    text("select id, kind, enabled, config from public.job_sources where id = :id"),
                    {"id": source_id},
                )
                .mappings()
                .first()
            )
            if not row:
                return None
            source = dict(row)
            if source["kind"] == "ats":
                # Company boards for this ATS come from the admin-managed list.
                companies = conn.execute(
                    text(
                        "select slug, name from public.ats_companies"
                        " where ats = :id and enabled order by name"
                    ),
                    {"id": source_id},
                ).mappings()
                source["config"] = {
                    **(source.get("config") or {}),
                    "companies": [dict(c) for c in companies],
                }
            return source

    def requested_sources(self) -> list[str]:
        with self.engine.connect() as conn:
            rows = conn.execute(
                text(
                    "select id from public.job_sources where run_requested_at is not null"
                    " order by run_requested_at"
                )
            )
            return [r[0] for r in rows]

    def enabled_sources(self) -> list[str]:
        with self.engine.connect() as conn:
            rows = conn.execute(text("select id from public.job_sources where enabled order by id"))
            return [r[0] for r in rows]

    def start_run(self, source_id: str) -> int:
        with self.engine.begin() as conn:
            conn.execute(
                text("update public.job_sources set run_requested_at = null where id = :id"),
                {"id": source_id},
            )
            return int(
                conn.execute(
                    text("insert into public.job_runs (source_id) values (:id) returning id"),
                    {"id": source_id},
                ).scalar_one()
            )

    def upsert(self, source_id: str, jobs: list[Job]) -> tuple[int, int]:
        inserted = updated = 0
        with self.engine.begin() as conn:
            for job in jobs:
                params = {**asdict(job), "source_id": source_id}
                if conn.execute(_UPSERT, params).scalar_one():
                    inserted += 1
                else:
                    updated += 1
        return inserted, updated

    def expire_unseen(self, source_id: str, run_id: int) -> int:
        """Expires the source's jobs that this (complete) run didn't see."""
        with self.engine.begin() as conn:
            result = conn.execute(
                text(
                    "update public.jobs set status = 'expired', expired_at = now()"
                    " where source_id = :id and status = 'active' and last_seen_at <"
                    " (select started_at from public.job_runs where id = :run)"
                ),
                {"id": source_id, "run": run_id},
            )
            return result.rowcount

    def finish_run(
        self, run_id: int, source_id: str, status: str, counts: dict[str, int], error: str | None
    ) -> None:
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    "update public.job_runs set finished_at = now(), status = :status,"
                    " fetched = :fetched, kept = :kept, inserted = :inserted,"
                    " updated = :updated, expired = :expired, error = :error where id = :run"
                ),
                {"run": run_id, "status": status, "error": error, **counts},
            )
            conn.execute(
                text(
                    "update public.job_sources set last_run_at = now(), last_status = :status,"
                    " last_error = :error, active_jobs = (select count(*) from public.jobs"
                    " where source_id = :id and status = 'active') where id = :id"
                ),
                {"id": source_id, "status": status, "error": error},
            )

    def housekeeping(self) -> dict[str, int]:
        """Expires past-deadline jobs and jobs no longer listed, deletes long-expired
        ones, marks duplicates."""
        with self.engine.begin() as conn:
            aged = conn.execute(
                text(
                    "update public.jobs set status = 'expired', expired_at = now()"
                    " where status = 'active' and (deadline < current_date"
                    f" or last_seen_at < now() - interval '{STALE_DAYS} days')"
                )
            ).rowcount
            deleted = conn.execute(
                text(
                    "delete from public.jobs where status = 'expired'"
                    f" and expired_at < now() - interval '{KEEP_EXPIRED_DAYS} days'"
                )
            ).rowcount
            duplicates = int(
                conn.execute(text("select public.jobs_resolve_duplicates()")).scalar_one()
            )
        return {"aged_out": aged, "deleted": deleted, "duplicates_marked": duplicates}
