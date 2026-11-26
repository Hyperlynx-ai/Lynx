"""Arbeitnow (https://www.arbeitnow.com/api/job-board-api): free, no key,
mostly Germany and Europe. Terms: commercial use needs a monthly fee agreed
with Arbeitnow (KL-26). Links go to the posting on Arbeitnow.
"""

from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any

from ..normalize import RawJob
from . import FetchResult
from .http import client, get_json, pause

URL = "https://www.arbeitnow.com/api/job-board-api"


def to_raw_job(item: Mapping[str, Any]) -> RawJob:
    created = item.get("created_at")
    types = item.get("job_types") or []
    return RawJob(
        external_id=str(item["slug"]),
        url=str(item["url"]),
        title=str(item.get("title") or ""),
        company=item.get("company_name"),
        location=item.get("location"),
        description=item.get("description"),
        remote=bool(item.get("remote")),
        employment_type=str(types[0]) if types else None,
        categories=[str(t) for t in item.get("tags") or []],
        posted_at=datetime.fromtimestamp(created, UTC)
        if isinstance(created, int | float)
        else None,
        country_hint="DE",
    )


def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
    max_pages = int(config.get("max_pages", 10))
    jobs: list[RawJob] = []
    complete = False
    with client() as http:
        for page in range(1, max_pages + 1):
            data = get_json(http, URL, params={"page": page})
            jobs.extend(to_raw_job(item) for item in data.get("data") or [])
            if not (data.get("links") or {}).get("next"):
                complete = True
                break
            pause()
    return FetchResult(jobs, complete)
