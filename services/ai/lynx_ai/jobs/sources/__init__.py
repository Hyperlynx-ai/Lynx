"""Source adapters (ADR 0011): one module per source, registered here.

An adapter is a function `fetch(config, env) -> FetchResult`:
- `config` is the source's `job_sources.config` (no secrets);
- `env` holds environment variables (API keys come from GitHub Actions
  secrets; never log them);
- `complete=True` means every current posting was fetched, so jobs it
  didn't return can be expired. Use False when paging stopped early.
"""

from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from typing import Any

from ..normalize import RawJob


@dataclass
class FetchResult:
    jobs: list[RawJob] = field(default_factory=list)
    complete: bool = True


Fetch = Callable[[Mapping[str, Any], Mapping[str, str]], FetchResult]

#: source id (as in job_sources.id) -> adapter. Filled in by later chunks.
ADAPTERS: dict[str, Fetch] = {}
