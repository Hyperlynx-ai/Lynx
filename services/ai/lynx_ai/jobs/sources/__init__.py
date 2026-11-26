"""Source adapters (ADR 0011): one module per source, registered here.

An adapter is a function `fetch(config, env) -> FetchResult`:
- `config` is the source's `job_sources.config` (no secrets);
- `env` holds environment variables (API keys come from GitHub Actions
  secrets; never log them);
- `complete=True` means every current posting was fetched, so jobs it
  didn't return can be expired. Use False when paging stopped early or the
  source is a search (its jobs then expire when no run has seen them for a
  week);
- `note` says what went wrong in a run that still returned jobs (the run is
  then "partial"; shown in the admin console).
"""

from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from typing import Any

from ..normalize import RawJob


@dataclass
class FetchResult:
    jobs: list[RawJob] = field(default_factory=list)
    complete: bool = True
    note: str | None = None


Fetch = Callable[[Mapping[str, Any], Mapping[str, str]], FetchResult]


def _adapters() -> dict[str, Fetch]:
    from . import arbeitnow, ats, curated_sheet, himalayas, jobicy, jobspy_sites, reed, remoteok

    return {
        **{name: ats.make_fetch(name) for name in ats.BOARDS},
        **{name: jobspy_sites.make_fetch(name) for name in jobspy_sites.SITES},
        "curated_sheet": curated_sheet.fetch,
        "arbeitnow": arbeitnow.fetch,
        "remoteok": remoteok.fetch,
        "himalayas": himalayas.fetch,
        "jobicy": jobicy.fetch,
        "reed": reed.fetch,
    }


#: source id (as in job_sources.id) -> adapter.
ADAPTERS: dict[str, Fetch] = _adapters()
