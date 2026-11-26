"""RemoteOK (https://remoteok.com/api): free, no key, remote jobs.

Terms (the API's legal notice): link back to the job's URL on Remote OK
(followed link) and mention Remote OK as the source; don't use its logo.
So `url` is Remote OK's own job page, not the employer's apply link.
"""

from collections.abc import Mapping
from datetime import datetime
from typing import Any

from ..normalize import RawJob
from . import FetchResult
from .http import client, get_json

URL = "https://remoteok.com/api"


def to_raw_job(item: Mapping[str, Any]) -> RawJob | None:
    if not item.get("id") or not item.get("position"):
        return None  # the first element is the legal notice
    date = item.get("date")
    salary_min, salary_max = item.get("salary_min") or None, item.get("salary_max") or None
    return RawJob(
        external_id=str(item["id"]),
        url=str(item.get("url") or f"https://remoteok.com/remote-jobs/{item['id']}"),
        title=str(item["position"]),
        company=item.get("company"),
        location=item.get("location") or "Remote",
        description=item.get("description"),
        remote=True,
        categories=[str(t) for t in item.get("tags") or []],
        salary_min=float(salary_min) if salary_min else None,
        salary_max=float(salary_max) if salary_max else None,
        salary_currency="USD" if salary_min or salary_max else None,
        posted_at=datetime.fromisoformat(date) if isinstance(date, str) and date else None,
    )


def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
    with client() as http:
        data = get_json(http, URL)
    jobs = [job for item in data if isinstance(item, dict) and (job := to_raw_job(item))]
    return FetchResult(jobs, complete=True)
