"""Ingestion command line, run by GitHub Actions (ADR 0011).

    python -m lynx_ai.jobs run --enabled      # every enabled source (daily)
    python -m lynx_ai.jobs run --requested    # sources an admin asked to run now
    python -m lynx_ai.jobs run --source arbeitnow [--source remotive ...]

Needs DATABASE_URL. Prints counts only (workflow logs are public).
"""

import argparse
import sys

from ..db import get_engine
from .pipeline import run_source
from .store import PostgresJobStore


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m lynx_ai.jobs")
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="ingest jobs from sources")
    which = run.add_mutually_exclusive_group(required=True)
    which.add_argument("--enabled", action="store_true", help="every enabled source")
    which.add_argument("--requested", action="store_true", help="sources an admin asked to run")
    which.add_argument("--source", action="append", help="this source (repeatable)")
    args = parser.parse_args(argv)

    store = PostgresJobStore(get_engine())
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
