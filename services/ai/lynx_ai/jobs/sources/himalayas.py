"""Himalayas (https://himalayas.app/jobs/api): free, no key, remote jobs.

Terms: credit Himalayas as the source; every Apply must use the job's
`applicationLink`; don't pass the jobs to other aggregators. Browse is
cursor-paged, 20 jobs a page; we take a capped number of pages per run.
"""

from collections.abc import Mapping
from datetime import UTC, date, datetime
from typing import Any

from ..normalize import RawJob
from . import FetchResult
from .http import client, get_json, pause

URL = "https://himalayas.app/jobs/api"


def _when(value: Any) -> datetime | None:
    if isinstance(value, int | float):
        return datetime.fromtimestamp(value, UTC)
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def to_raw_job(item: Mapping[str, Any]) -> RawJob | None:
    link = item.get("applicationLink")
    if not link or not item.get("title"):
        return None
    places = [str(p) for p in item.get("locationRestrictions") or []]
    expiry = _when(item.get("expiryDate"))
    seniority = item.get("seniority") or []
    return RawJob(
        external_id=str(item.get("guid") or link),
        url=str(link),
        title=str(item["title"]),
        company=item.get("companyName"),
        location=", ".join(places) if places else "Worldwide",
        description=item.get("description") or item.get("excerpt"),
        remote=True,
        employment_type=item.get("employmentType"),
        categories=[str(c) for c in [*(item.get("categories") or []), *seniority]],
        salary_min=item.get("minSalary"),
        salary_max=item.get("maxSalary"),
        salary_currency=item.get("currency"),
        posted_at=_when(item.get("pubDate")),
        deadline=date(expiry.year, expiry.month, expiry.day) if expiry else None,
    )


def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
    max_pages = int(config.get("max_pages", 30))
    jobs: list[RawJob] = []
    complete = False
    cursor: str | None = None
    with client() as http:
        for _ in range(max_pages):
            params: dict[str, Any] = {"limit": 20}
            if cursor:
                params["cursor"] = cursor
            data = get_json(http, URL, params=params)
            jobs.extend(job for item in data.get("jobs") or [] if (job := to_raw_job(item)))
            cursor = data.get("nextCursor")
            if not cursor:
                complete = True
                break
            pause()
    return FetchResult(jobs, complete)
