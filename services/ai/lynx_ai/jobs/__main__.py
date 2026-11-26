"""Ingestion command line, run by GitHub Actions (ADR 0011).

    python -m lynx_ai.jobs run --enabled      # every enabled source (daily)
    python -m lynx_ai.jobs run --requested    # sources an admin asked to run now
    python -m lynx_ai.jobs run --source arbeitnow [--source remotive ...]
    python -m lynx_ai.jobs check              # database reachable? schema there?
    python -m lynx_ai.jobs embed              # embeddings for new jobs (NVIDIA_API_KEY)
    python -m lynx_ai.jobs match --all        # rank jobs for every onboarded candidate
    python -m lynx_ai.jobs match --requested  # ... whose profile changed since

Needs DATABASE_URL. Prints counts only (workflow logs are public).
"""

import argparse
import os
import sys

from ..db import get_engine
from .pipeline import run_source
from .store import PostgresJobStore


def check(store: PostgresJobStore) -> int:
    """Connects and reports the schema state: for pull requests and setup."""
    from sqlalchemy import text

    with store.engine.connect() as conn:
        exists = conn.execute(text("select to_regclass('public.job_sources') is not null")).scalar()
        if not exists:
            print("Database reachable; the jobs tables aren't there yet (migration not applied).")
            return 0
        sources = conn.execute(
            text("select count(*), count(*) filter (where enabled) from public.job_sources")
        ).one()
        jobs = conn.execute(
            text("select count(*) from public.jobs where status = 'active'")
        ).scalar()
    print(f"Database reachable: {sources[0]} sources ({sources[1]} enabled), {jobs} active jobs.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m lynx_ai.jobs")
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="ingest jobs from sources")
    which = run.add_mutually_exclusive_group(required=True)
    which.add_argument("--enabled", action="store_true", help="every enabled source")
    which.add_argument("--requested", action="store_true", help="sources an admin asked to run")
    which.add_argument("--source", action="append", help="this source (repeatable)")
    sub.add_parser("check", help="check the database connection and schema (no fetching)")
    emb = sub.add_parser("embed", help="embed active jobs that have no embedding yet")
    emb.add_argument("--minutes", type=float, default=20, help="time budget (default 20)")
    match = sub.add_parser("match", help="rank jobs for candidates")
    who = match.add_mutually_exclusive_group(required=True)
    who.add_argument("--all", action="store_true", help="every onboarded candidate")
    who.add_argument("--requested", action="store_true", help="candidates whose profile changed")
    match.add_argument("--no-ai", action="store_true", help="skip the AI re-ranking")
    args = parser.parse_args(argv)

    if args.command in {"embed", "match"} and not os.environ.get("NVIDIA_API_KEY"):
        # Not set up yet (repository secret): skip rather than fail the workflow.
        print(f"Skipped {args.command}: NVIDIA_API_KEY is not set.")
        return 0
    store = PostgresJobStore(get_engine())
    if args.command == "check":
        return check(store)
    if args.command == "embed":
        from .embed import EmbeddingError, embed_jobs

        try:
            done = embed_jobs(store.engine, budget_s=args.minutes * 60)
        except EmbeddingError as error:
            print(f"Embedding failed: {error}")
            return 1
        print(f"Embedded {done} jobs.")
        return 0
    if args.command == "match":
        from .matching import Matcher

        summary = Matcher(store.engine).run(requested_only=args.requested, use_ai=not args.no_ai)
        print(
            f"Matched {summary.matched} of {summary.candidates} candidates"
            f" ({summary.reranked} re-ranked by the AI, {summary.failed} failed)."
        )
        return 1 if summary.failed and not summary.matched else 0
    if args.enabled:
        sources = store.enabled_sources()
    elif args.requested:
        sources = store.requested_sources()
    else:
        sources = args.source
    if not sources:
        print("No sources to run.")
        return 0

    failed = 0
    for source_id in sources:
        s = run_source(source_id, store)
        failed += s.status == "failed"
        print(
            f"{s.source}: {s.status} fetched={s.fetched} kept={s.kept} new={s.inserted}"
            f" updated={s.updated} expired={s.expired}" + (f" error={s.error}" if s.error else ""),
            flush=True,
        )
    totals = store.housekeeping()
    print("housekeeping: " + " ".join(f"{k}={v}" for k, v in totals.items()))
    return 1 if failed == len(sources) else 0


if __name__ == "__main__":
    sys.exit(main())
