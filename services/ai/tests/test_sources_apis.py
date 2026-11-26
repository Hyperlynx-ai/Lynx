"""Source adapters for the free job APIs (synthetic items in each API's shape)."""

from datetime import date
from typing import Any

import httpx
import pytest

from lynx_ai.jobs.normalize import normalize
from lynx_ai.jobs.sources import ADAPTERS, arbeitnow, himalayas, http, jobicy, reed, remoteok


@pytest.fixture(autouse=True)
def no_pauses(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(http, "PAGE_PAUSE", 0)


def test_all_api_sources_are_registered() -> None:
    assert {"arbeitnow", "remoteok", "himalayas", "jobicy", "reed"} <= set(ADAPTERS)


def test_arbeitnow_item() -> None:
    raw = arbeitnow.to_raw_job(
        {
            "slug": "backend-dev-acme-123",
            "url": "https://www.arbeitnow.com/jobs/companies/acme/backend-dev-acme-123",
            "title": "Backend Developer (m/w/d)",
            "company_name": "Acme GmbH",
            "location": "Mannheim",
            "description": "<p>Python and Go</p>",
            "remote": False,
            "job_types": ["full time"],
            "tags": ["Software Development"],
            "created_at": 1795600000,
        }
    )
    job = normalize(raw)
    assert job is not None
    assert (job.country, job.employment_type, job.field) == ("DE", "full_time", "software")


def test_remoteok_skips_the_legal_notice_and_links_to_remoteok() -> None:
    assert remoteok.to_raw_job({"legal": "Please link back"}) is None
    raw = remoteok.to_raw_job(
        {
            "id": "1234",
            "position": "Senior Data Engineer",
            "company": "Example Inc",
            "location": "US Only",
            "url": "https://remoteok.com/remote-jobs/1234",
            "apply_url": "https://example.test/apply",
            "tags": ["data", "sql"],
            "date": "2026-11-25T10:00:00+00:00",
            "salary_min": 120000,
            "salary_max": 160000,
        }
    )
    assert raw is not None and raw.url.startswith("https://remoteok.com/")
    job = normalize(raw)
    assert job is not None and (job.country, job.remote, job.field) == ("US", True, "data_ai")


def test_himalayas_uses_the_application_link() -> None:
    raw = himalayas.to_raw_job(
        {
            "guid": "himalayas-1",
            "title": "Product Designer",
            "companyName": "Example",
            "applicationLink": "https://himalayas.app/companies/example/jobs/product-designer",
            "locationRestrictions": ["Germany", "Netherlands"],
            "employmentType": "Full Time",
            "categories": ["Design"],
            "seniority": ["Mid-level"],
            "pubDate": 1795600000,
            "expiryDate": 1798200000,
        }
    )
    assert raw is not None and raw.url.endswith("/product-designer")
    job = normalize(raw)
    assert job is not None and (job.country, job.field) == ("DE", "design")
    assert job.deadline is not None


def test_jobicy_item() -> None:
    raw = jobicy.to_raw_job(
        {
            "id": 99,
            "url": "https://jobicy.com/jobs/99-support",
            "jobTitle": "Customer Support Specialist",
            "companyName": "Example",
            "jobGeo": "Anywhere",
            "jobIndustry": ["Customer Success"],
            "jobType": ["full-time"],
            "jobLevel": "Any",
            "pubDate": "2026-11-25 08:00:00",
        }
    )
    job = normalize(raw) if raw else None
    assert job is not None and job.country is None and job.remote
    assert job.field == "customer_support"


def test_reed_item_and_key() -> None:
    raw = reed.to_raw_job(
        {
            "jobId": 555,
            "jobTitle": "Graduate Software Engineer",
            "employerName": "Example Ltd",
            "locationName": "Little Snoring",
            "jobUrl": "https://www.reed.co.uk/jobs/graduate-software-engineer/555",
            "minimumSalary": 32000,
            "maximumSalary": 36000,
            "currency": "GBP",
            "date": "24/11/2026",
            "expirationDate": "05/01/2027",
            "jobDescription": "Visa sponsorship available...",
        }
    )
    job = normalize(raw) if raw else None
    assert job is not None
    assert (job.country, job.seniority, job.deadline) == ("GB", "entry", date(2027, 1, 5))
    with pytest.raises(RuntimeError, match="REED_API_KEY"):
        reed.fetch({}, {})


def paged(pages: list[dict[str, Any]]) -> httpx.MockTransport:
    calls = iter(pages)
    return httpx.MockTransport(lambda request: httpx.Response(200, json=next(calls)))


def test_paging_stops_at_the_last_page_or_the_cap(monkeypatch: pytest.MonkeyPatch) -> None:
    item = {"slug": "a", "url": "https://example.test/a", "title": "Chef", "location": "Berlin"}
    pages = [
        {"data": [item], "links": {"next": "page2"}},
        {"data": [{**item, "slug": "b"}], "links": {"next": None}},
    ]
    monkeypatch.setattr(arbeitnow, "client", lambda: httpx.Client(transport=paged(pages)))
    result = arbeitnow.fetch({}, {})
    assert (len(result.jobs), result.complete) == (2, True)

    pages = [{"data": [item], "links": {"next": "more"}}]
    monkeypatch.setattr(arbeitnow, "client", lambda: httpx.Client(transport=paged(pages)))
    capped = arbeitnow.fetch({"max_pages": 1}, {})
    assert (len(capped.jobs), capped.complete) == (1, False)


def test_rate_limits_are_retried() -> None:
    responses = iter(
        [httpx.Response(429, headers={"Retry-After": "0"}), httpx.Response(200, json=[])]
    )
    client = httpx.Client(transport=httpx.MockTransport(lambda request: next(responses)))
    assert http.get_json(client, "https://example.test/api") == []
