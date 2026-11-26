"""Reed (https://www.reed.co.uk/api/1.0/search): UK jobs, needs REED_API_KEY
(HTTP Basic, key as the user name). Reed publishes no API terms; its website
terms bar commercial copying, so get Reed's written permission before a
commercial launch (KL-26). Links go to the job on reed.co.uk.

Reed lists the whole UK, so we run a few focused searches (config
`searches`) instead of taking everything; the run is never "complete", so
jobs expire by age or their expiration date rather than by absence.
"""

from collections.abc import Mapping
from datetime import UTC, date, datetime
from typing import Any

from ..normalize import RawJob
from . import FetchResult
from .http import client, get_json, pause

URL = "https://www.reed.co.uk/api/1.0/search"
DEFAULT_SEARCHES = [
    "visa sponsorship",
    "graduate",
    "software engineer",
    "data analyst",
    "nurse",
    "mechanical engineer",
]


def _day(value: Any) -> date | None:
    """Reed dates look like 25/11/2026."""
    try:
        return datetime.strptime(str(value), "%d/%m/%Y").date() if value else None
    except ValueError:
        return None


def to_raw_job(item: Mapping[str, Any]) -> RawJob | None:
    if not item.get("jobId") or not item.get("jobTitle"):
        return None
    posted = _day(item.get("date"))
    return RawJob(
        external_id=str(item["jobId"]),
        url=str(item.get("jobUrl") or f"https://www.reed.co.uk/jobs/{item['jobId']}"),
        title=str(item["jobTitle"]),
        company=item.get("employerName"),
        location=item.get("locationName"),
        description=item.get("jobDescription"),
        remote=False,
        salary_min=item.get("minimumSalary"),
        salary_max=item.get("maximumSalary"),
        salary_currency=item.get("currency") or "GBP",
        posted_at=datetime(posted.year, posted.month, posted.day, tzinfo=UTC) if posted else None,
        deadline=_day(item.get("expirationDate")),
        country_hint="GB",
    )


def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
    key = env.get("REED_API_KEY", "").strip()
    if not key:
        raise RuntimeError("REED_API_KEY is not set")
    searches = list(config.get("searches") or DEFAULT_SEARCHES)
    pages = int(config.get("pages_per_search", 2))
    jobs: dict[str, RawJob] = {}
    with client(auth=(key, "")) as http:
        for keywords in searches:
            for page in range(pages):
                data = get_json(
                    http,
                    URL,
                    params={
                        "keywords": keywords,
                        "resultsToTake": 100,
                        "resultsToSkip": page * 100,
                    },
                )
                results = data.get("results") or []
                for item in results:
                    if job := to_raw_job(item):
                        jobs[job.external_id] = job
                pause()
                if len(results) < 100:
                    break
    return FetchResult(list(jobs.values()), complete=False)
