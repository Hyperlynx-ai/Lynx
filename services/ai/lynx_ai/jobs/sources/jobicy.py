"""Jobicy (https://jobicy.com/api/jobs): free, no key, remote jobs from the
last 7 days. Terms: credit Jobicy as the original source and don't present
its listings as our own; storing is allowed. Cursor-paged, up to 100 a page.
"""

from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any

from ..normalize import RawJob
from . import FetchResult
from .http import client, get_json, pause

URL = "https://jobicy.com/api/jobs"


def _as_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    return [str(value)] if value else []


def to_raw_job(item: Mapping[str, Any]) -> RawJob | None:
    if not item.get("id") or not item.get("url") or not item.get("jobTitle"):
        return None
    posted = item.get("pubDate")
    try:
        posted_at = datetime.fromisoformat(str(posted)).replace(tzinfo=UTC) if posted else None
    except ValueError:
        posted_at = None
    types = _as_list(item.get("jobType"))
    return RawJob(
        external_id=str(item["id"]),
        url=str(item["url"]),
        title=str(item["jobTitle"]),
        company=item.get("companyName"),
        location=item.get("jobGeo") or "Anywhere",
        description=item.get("jobDescription") or item.get("jobExcerpt"),
        remote=True,
        employment_type=types[0] if types else None,
        categories=[*_as_list(item.get("jobIndustry")), *_as_list(item.get("jobLevel"))],
        salary_min=item.get("salaryMin"),
        salary_max=item.get("salaryMax"),
        salary_currency=item.get("salaryCurrency"),
        posted_at=posted_at,
    )


def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
    max_pages = int(config.get("max_pages", 10))
    jobs: list[RawJob] = []
    complete = False
    cursor: str | None = None
    with client() as http:
        for _ in range(max_pages):
            params: dict[str, Any] = {"count": 100}
            if cursor:
                params["cursor"] = cursor
            data = get_json(http, URL, params=params)
            jobs.extend(job for item in data.get("jobs") or [] if (job := to_raw_job(item)))
            cursor = data.get("nextCursor")
            if not data.get("hasMore") or not cursor:
                complete = True
                break
            pause()
    return FetchResult(jobs, complete)
