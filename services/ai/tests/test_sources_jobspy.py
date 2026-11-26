"""Job sites read with JobSpy: the row mapping and search rotation (no network)."""

from datetime import date
from types import SimpleNamespace
from typing import Any

import pytest

from lynx_ai.jobs.normalize import normalize
from lynx_ai.jobs.sources import ADAPTERS, jobspy_sites


def test_every_site_is_a_source() -> None:
    assert set(jobspy_sites.SITES) <= set(ADAPTERS)


def test_an_indeed_row() -> None:
    nan = float("nan")
    raw = jobspy_sites.to_raw_job(
        {
            "id": "in-131c16d89a6c76b4",
            "site": "indeed",
            "job_url": "https://ae.indeed.com/viewjob?jk=131c16d89a6c76b4",
            "title": "IT Operations & Support Engineer",
            "company": "Example Group",
            "location": "Dubai, DU, United Arab Emirates",
            "date_posted": date(2026, 11, 25),
            "job_type": "fulltime",
            "min_amount": 120000.0,
            "max_amount": nan,
            "currency": "AED",
            "interval": "yearly",
            "is_remote": False,
            "description": "Support our **cloud** and network estate.",
            "job_function": nan,
        },
        "AE",
    )
    assert raw is not None
    assert raw.salary_text == "AED 120,000 per yearly"
    job = normalize(raw)
    assert job is not None
    assert (job.country, job.city, job.employment_type) == ("AE", "Dubai", "full_time")
    assert job.posted_at is not None and job.posted_at.date() == date(2026, 11, 25)


def test_us_states_are_not_read_as_countries() -> None:
    raw = jobspy_sites.to_raw_job(
        {
            "id": "li-1",
            "job_url": "https://www.linkedin.com/jobs/view/1",
            "title": "Software Engineer",
            "company": "Example",
            "location": "Sunnyvale, CA, United States",
        },
        "US",
    )
    job = normalize(raw) if raw else None
    assert job is not None and job.country == "US"


def test_rows_without_an_id_link_or_title_are_skipped() -> None:
    assert jobspy_sites.to_raw_job({"id": "x", "title": "Chef"}, "GB") is None


def test_searches_rotate_through_terms_and_places() -> None:
    terms = ["a", "b", "c"]
    places = [{"place": "Dubai", "country": "AE"}, {"place": "London", "country": "GB"}]
    day1 = jobspy_sites.todays_searches(terms, places, 4, date(2026, 11, 27))
    day2 = jobspy_sites.todays_searches(terms, places, 4, date(2026, 11, 28))
    assert len(day1) == len(day2) == 4 and day1 != day2
    assert len(jobspy_sites.todays_searches(terms, places, 10)) == 6  # all of them


class FakeFrame:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows

    def to_dict(self, orient: str) -> list[dict[str, Any]]:
        return self.rows


def test_a_run_skips_failed_searches_and_says_so(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[dict[str, Any]] = []

    def scrape_jobs(**kwargs: Any) -> FakeFrame:
        calls.append(kwargs)
        if kwargs["location"] == "London":
            raise RuntimeError("blocked")
        return FakeFrame(
            [{"id": f"in-{len(calls)}", "job_url": "https://x.test/1", "title": "Analyst"}]
        )

    monkeypatch.setitem(
        __import__("sys").modules, "jobspy", SimpleNamespace(scrape_jobs=scrape_jobs)
    )
    monkeypatch.setattr(jobspy_sites, "SEARCH_PAUSE", 0)
    config = {
        "terms": ["analyst"],
        "places": [
            {"place": "Dubai", "country": "AE"},
            {"place": "London", "country": "GB"},
            {"place": "Valletta", "country": "MT"},  # Indeed: no JobSpy country
        ],
    }
    result = ADAPTERS["indeed"](config, {})
    assert (len(result.jobs), result.complete) == (1, False)
    assert result.note == "searches that failed: 2 of 3"
    assert calls[0]["country_indeed"] == "united arab emirates"
    assert calls[0]["hours_old"] == 72

    monkeypatch.setitem(
        __import__("sys").modules,
        "jobspy",
        SimpleNamespace(scrape_jobs=lambda **kwargs: FakeFrame([])),
    )
    with pytest.raises(RuntimeError, match="no results"):
        ADAPTERS["linkedin"](config, {})
