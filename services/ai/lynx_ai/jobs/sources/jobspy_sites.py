"""Job sites read with JobSpy (chunk 3.6): LinkedIn, Indeed, Glassdoor, Naukri.

Public search pages only, never logged in. Each site is its own source with
its own switch, off until the owner switches it on: these sites' terms don't
allow automated reading (KL-27). Conservative by default: a few dozen
searches per run, a pause between them, postings from the last 3 days.

JobSpy (MIT) is in the `scrapers` dependency group: the ingestion workflow
installs it, the deployed AI service doesn't (it never runs scrapers), so
it's imported only when a scraper runs.

`job_sources.config`:
- `terms`: what to search for;
- `places`: where, as [{"place": "Dubai", "country": "AE"}];
- `results_wanted` (25 per search), `hours_old` (72), `max_searches` (30
  per run: the run takes the next slice of terms x places each day, so every
  search comes round every few days).

Search results never list every open job, so runs don't expire jobs by
absence; jobs no run has seen for a week expire (store.housekeeping).
"""

import math
import time
from collections.abc import Mapping
from datetime import UTC, date, datetime
from typing import Any

from ..normalize import RawJob
from . import FetchResult

#: Our source id -> JobSpy site name.
SITES = {
    "linkedin": "linkedin",
    "indeed": "indeed",
    "glassdoor": "glassdoor",
    "naukri": "naukri",
}

#: ISO country -> the country name JobSpy uses for Indeed and Glassdoor.
COUNTRY_NAMES = {
    "AE": "united arab emirates",
    "SA": "saudi arabia",
    "QA": "qatar",
    "OM": "oman",
    "KW": "kuwait",
    "BH": "bahrain",
    "DE": "germany",
    "NL": "netherlands",
    "IE": "ireland",
    "GB": "uk",
    "FR": "france",
    "BE": "belgium",
    "LU": "luxembourg",
    "AT": "austria",
    "CH": "switzerland",
    "PL": "poland",
    "CZ": "czech republic",
    "SE": "sweden",
    "FI": "finland",
    "DK": "denmark",
    "NO": "norway",
    "IT": "italy",
    "ES": "spain",
    "PT": "portugal",
    "SG": "singapore",
    "MY": "malaysia",
    "JP": "japan",
    "AU": "australia",
    "NZ": "new zealand",
    "CA": "canada",
    "US": "usa",
    "IN": "india",
}

#: Seconds between searches on the same site.
SEARCH_PAUSE = 8.0


def _value(record: Mapping[str, Any], key: str) -> Any:
    """A record value with pandas' missing markers (NaN, NaT, None) as None."""
    value = record.get(key)
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if type(value).__name__ in {"NaTType", "NAType"}:
        return None
    return value


def _posted(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=UTC)
    if isinstance(value, str) and value:
        try:
            return _posted(date.fromisoformat(value[:10]))
        except ValueError:
            return None
    return None


def _salary_text(record: Mapping[str, Any]) -> str | None:
    low, high = _value(record, "min_amount"), _value(record, "max_amount")
    if low is None and high is None:
        return None
    currency = _value(record, "currency") or ""
    interval = _value(record, "interval")
    amount = "–".join(f"{float(v):,.0f}" for v in (low, high) if v is not None)
    return " ".join(p for p in [currency, amount, f"per {interval}" if interval else ""] if p)


def to_raw_job(record: Mapping[str, Any], country: str | None) -> RawJob | None:
    """One JobSpy result row (a DataFrame record) as a raw job."""
    job_id, url, title = _value(record, "id"), _value(record, "job_url"), _value(record, "title")
    if not job_id or not url or not title:
        return None
    low, high = _value(record, "min_amount"), _value(record, "max_amount")
    categories = [
        str(c)
        for c in [
            _value(record, "job_function"),
            _value(record, "company_industry"),
            _value(record, "job_level"),
            _value(record, "skills"),
        ]
        if c
    ]
    return RawJob(
        external_id=str(job_id),
        url=str(url),
        title=str(title),
        company=_value(record, "company"),
        location=_value(record, "location"),
        description=_value(record, "description"),
        remote=bool(_value(record, "is_remote")),
        employment_type=_value(record, "job_type"),
        categories=categories,
        salary_text=_salary_text(record),
        salary_min=float(low) if low is not None else None,
        salary_max=float(high) if high is not None else None,
        salary_currency=_value(record, "currency"),
        posted_at=_posted(_value(record, "date_posted")),
        country_hint=country,
    )


def todays_searches(
    terms: list[str], places: list[dict[str, str]], limit: int, today: date | None = None
) -> list[tuple[str, dict[str, str]]]:
    """The next `limit` of terms x places, a different slice each day."""
    every = [(term, place) for place in places for term in terms]
    if len(every) <= limit:
        return every
    start = ((today or date.today()).toordinal() * limit) % len(every)
    return [every[(start + i) % len(every)] for i in range(limit)]


def make_fetch(source_id: str):
    site = SITES[source_id]

    def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
        # The `scrapers` dependency group (not installed for CI checks or Vercel).
        from jobspy import scrape_jobs  # pyright: ignore[reportMissingImports]

        searches = todays_searches(
            list(config.get("terms") or []),
            list(config.get("places") or []),
            int(config.get("max_searches") or 30),
        )
        if not searches:
            raise ValueError("no searches configured (terms and places)")
        jobs: list[RawJob] = []
        failed = 0
        for i, (term, place) in enumerate(searches):
            if i:
                time.sleep(SEARCH_PAUSE)
            country = place.get("country")
            kwargs: dict[str, Any] = {
                "site_name": [site],
                "search_term": term,
                "location": place.get("place"),
                "results_wanted": int(config.get("results_wanted") or 25),
                "hours_old": int(config.get("hours_old") or 72),
                "description_format": "markdown",
                "verbose": 0,
            }
            if site in {"indeed", "glassdoor"}:
                if country not in COUNTRY_NAMES:
                    failed += 1
                    continue
                kwargs["country_indeed"] = COUNTRY_NAMES[country]
            try:
                frame = scrape_jobs(**kwargs)
            except Exception:  # blocked, timed out or changed: skip this search
                failed += 1
                continue
            for record in frame.to_dict("records"):
                if job := to_raw_job(record, country):
                    jobs.append(job)
        if not jobs:
            raise RuntimeError(f"no results from {len(searches)} searches (blocked?)")
        note = f"searches that failed: {failed} of {len(searches)}" if failed else None
        return FetchResult(jobs, complete=False, note=note)

    return fetch
