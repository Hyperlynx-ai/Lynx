"""Company job boards on applicant tracking systems (synthetic boards in each API's shape)."""

from typing import Any

import httpx
import pytest

from lynx_ai.jobs.normalize import normalize
from lynx_ai.jobs.sources import ADAPTERS, ats, http


@pytest.fixture(autouse=True)
def no_pauses(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(http, "PAGE_PAUSE", 0)


BOARDS: dict[str, Any] = {
    "boards-api.greenhouse.io": {
        "jobs": [
            {
                "id": 11,
                "absolute_url": "https://job-boards.greenhouse.io/acme/jobs/11",
                "title": "Security Engineer",
                "location": {"name": "Berlin, Germany"},
                "content": "&lt;p&gt;Detection and response&lt;/p&gt;",
                "departments": [{"name": "Security"}],
                "first_published": "2026-11-20T09:00:00-05:00",
            }
        ]
    },
    "api.lever.co": [
        {
            "id": "abc",
            "text": "Backend Engineer",
            "hostedUrl": "https://jobs.lever.co/acme/abc",
            "categories": {"location": "Bengaluru, India", "commitment": "Full-time"},
            "descriptionPlain": "Python services",
            "lists": [{"text": "You have", "content": "<li>Go</li>"}],
            "workplaceType": "hybrid",
            "createdAt": 1795600000000,
        }
    ],
    "api.ashbyhq.com": {
        "jobs": [
            {
                "id": "u1",
                "title": "Data Scientist",
                "jobUrl": "https://jobs.ashbyhq.com/acme/u1",
                "location": "Remote - Canada",
                "isRemote": True,
                "employmentType": "FullTime",
                "descriptionHtml": "<p>Models</p>",
                "publishedAt": "2026-11-21T00:00:00Z",
            },
            {"id": "u2", "title": "Hidden", "jobUrl": "https://x.test", "isListed": False},
        ]
    },
    "api.smartrecruiters.com": {
        "content": [
            {
                "id": "744",
                "name": "Hotel Receptionist",
                "location": {"country": "fr", "city": "Paris", "remote": False},
                "typeOfEmployment": {"label": "Full-time"},
                "releasedDate": "2026-11-22T10:00:00.000Z",
            }
        ]
    },
    "acme.recruitee.com": {
        "offers": [
            {
                "id": 9,
                "title": "Marketing Manager",
                "careers_url": "https://acme.recruitee.com/o/marketing-manager",
                "country_code": "NL",
                "city": "Amsterdam",
                "description": "<p>Campaigns</p>",
                "employment_type_code": "fulltime",
                "created_at": "2026-11-23 10:00:00 UTC",
            }
        ]
    },
}


def board_client(fail: frozenset[str] = frozenset()) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        slug = "bad" if "bad" in str(request.url) else "acme"
        if slug in fail:
            return httpx.Response(404)
        return httpx.Response(200, json=BOARDS[request.url.host])

    return httpx.Client(transport=httpx.MockTransport(handler))


ACME = {"companies": [{"slug": "acme", "name": "Acme"}]}


def test_every_ats_is_a_source() -> None:
    assert set(ats.BOARDS) <= set(ADAPTERS)


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("greenhouse", ("DE", "cybersecurity", "Acme")),
        ("lever", ("IN", "software", "Acme")),
        ("ashby", ("CA", "data_ai", "Acme")),
        ("smartrecruiters", ("FR", "hospitality", "Acme")),
        ("recruitee", ("NL", "marketing", "Acme")),
    ],
)
def test_board_jobs_normalize(
    monkeypatch: pytest.MonkeyPatch, source: str, expected: tuple[str, str, str]
) -> None:
    monkeypatch.setattr(ats, "client", board_client)
    result = ADAPTERS[source](ACME, {})
    assert result.complete and len(result.jobs) == 1  # unlisted Ashby jobs are skipped
    job = normalize(result.jobs[0])
    assert job is not None
    assert (job.country, job.field, job.company) == expected
    assert job.external_id.startswith("acme:")


def test_a_failing_board_makes_the_run_partial_and_is_named(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(ats, "client", lambda: board_client(fail=frozenset({"bad"})))
    companies = {"companies": [*ACME["companies"], {"slug": "bad", "name": "Bad"}]}
    result = ADAPTERS["greenhouse"](companies, {})
    assert (len(result.jobs), result.complete) == (1, False)
    assert result.note == "boards that failed: bad"

    with pytest.raises(RuntimeError, match="every greenhouse board failed"):
        ADAPTERS["greenhouse"]({"companies": [{"slug": "bad", "name": "Bad"}]}, {})


def test_no_companies_is_an_empty_partial_run() -> None:
    result = ADAPTERS["lever"]({}, {})
    assert (result.jobs, result.complete) == ([], False)
