"""Public company job boards on applicant tracking systems (chunk 3.5).

One source per ATS (greenhouse, lever, ashby, smartrecruiters, recruitee).
The companies come from the admin-managed `ats_companies` table, passed in
`config["companies"]` as [{"slug": ..., "name": ...}]. These are the public
APIs companies use for their own careers pages; we show each job with the
company's name and link to its own posting to apply.

A company whose board fails is skipped (the run becomes "partial", so no
jobs are expired by absence); the others still count.
"""

import html
from collections.abc import Callable, Iterable, Mapping
from datetime import UTC, datetime
from typing import Any

import httpx

from ..normalize import RawJob
from . import FetchResult
from .http import client, get_json, pause


def _iso(value: Any) -> datetime | None:
    if isinstance(value, int | float):
        return datetime.fromtimestamp(value / 1000 if value > 1e11 else value, UTC)
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _place(country_code: Any, city: Any, fallback: Any = None) -> str | None:
    """ "DE, Berlin": a leading country code, which normalization understands."""
    code = str(country_code or "").strip().upper()
    if len(code) == 2:
        return f"{code}, {city}" if city else code
    return str(fallback or city or "") or None


def greenhouse(http: httpx.Client, slug: str, name: str) -> Iterable[RawJob]:
    data = get_json(
        http, f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs", params={"content": "true"}
    )
    for job in data.get("jobs") or []:
        yield RawJob(
            external_id=f"{slug}:{job['id']}",
            url=job["absolute_url"],
            title=job.get("title") or "",
            company=name,
            location=(job.get("location") or {}).get("name"),
            description=html.unescape(job.get("content") or ""),
            categories=[d.get("name", "") for d in job.get("departments") or []],
            posted_at=_iso(job.get("first_published") or job.get("updated_at")),
        )


def lever(http: httpx.Client, slug: str, name: str) -> Iterable[RawJob]:
    data = get_json(http, f"https://api.lever.co/v0/postings/{slug}", params={"mode": "json"})
    for job in data if isinstance(data, list) else []:
        cats = job.get("categories") or {}
        lists = "\n".join(
            f"{block.get('text', '')}\n{block.get('content', '')}"
            for block in job.get("lists") or []
        )
        yield RawJob(
            external_id=f"{slug}:{job['id']}",
            url=job.get("hostedUrl") or job.get("applyUrl"),
            title=job.get("text") or "",
            company=name,
            location=cats.get("location") or ", ".join(cats.get("allLocations") or []) or None,
            description=f"{job.get('descriptionPlain') or ''}\n{lists}".strip(),
            remote=job.get("workplaceType") == "remote",
            employment_type=cats.get("commitment"),
            categories=[c for c in [cats.get("team"), cats.get("department")] if c],
            posted_at=_iso(job.get("createdAt")),
        )


def ashby(http: httpx.Client, slug: str, name: str) -> Iterable[RawJob]:
    data = get_json(http, f"https://api.ashbyhq.com/posting-api/job-board/{slug}")
    types = {
        "FullTime": "full_time",
        "PartTime": "part_time",
        "Intern": "internship",
        "Contract": "contract",
        "Temporary": "temporary",
    }
    for job in data.get("jobs") or []:
        if job.get("isListed") is False:
            continue
        places = [
            job.get("location"),
            *[(s or {}).get("location") for s in job.get("secondaryLocations") or []],
        ]
        yield RawJob(
            external_id=f"{slug}:{job['id']}",
            url=job.get("jobUrl") or job.get("applyUrl"),
            title=job.get("title") or "",
            company=name,
            location=", ".join(p for p in places if p) or None,
            description=job.get("descriptionHtml") or job.get("descriptionPlain"),
            remote=bool(job.get("isRemote")),
            employment_type=types.get(str(job.get("employmentType"))),
            categories=[c for c in [job.get("department"), job.get("team")] if c],
            posted_at=_iso(job.get("publishedAt")),
        )


def smartrecruiters(
    http: httpx.Client, slug: str, name: str, max_pages: int = 10
) -> Iterable[RawJob]:
    for page in range(max_pages):
        data = get_json(
            http,
            f"https://api.smartrecruiters.com/v1/companies/{slug}/postings",
            params={"limit": 100, "offset": page * 100},
        )
        content = data.get("content") or []
        for job in content:
            loc = job.get("location") or {}
            yield RawJob(
                external_id=f"{slug}:{job['id']}",
                url=f"https://jobs.smartrecruiters.com/{slug}/{job['id']}",
                title=job.get("name") or "",
                company=name,
                location=_place(loc.get("country"), loc.get("city"), loc.get("fullLocation")),
                remote=bool(loc.get("remote")),
                employment_type=(job.get("typeOfEmployment") or {}).get("label"),
                categories=[
                    c
                    for c in [
                        (job.get("department") or {}).get("label"),
                        (job.get("function") or {}).get("label"),
                        (job.get("experienceLevel") or {}).get("label"),
                    ]
                    if c
                ],
                posted_at=_iso(job.get("releasedDate")),
            )
        if len(content) < 100:
            return
        pause()


def recruitee(http: httpx.Client, slug: str, name: str) -> Iterable[RawJob]:
    data = get_json(http, f"https://{slug}.recruitee.com/api/offers/")
    for job in data.get("offers") or []:
        yield RawJob(
            external_id=f"{slug}:{job['id']}",
            url=job.get("careers_url") or job.get("careers_apply_url"),
            title=job.get("title") or "",
            company=name,
            location=_place(job.get("country_code"), job.get("city"), job.get("location")),
            description=job.get("description"),
            remote=bool(job.get("remote")),
            employment_type=job.get("employment_type_code"),
            categories=[c for c in [job.get("department")] if c],
            posted_at=_iso(job.get("created_at") or job.get("published_at")),
        )


BoardFetch = Callable[[httpx.Client, str, str], Iterable[RawJob]]
BOARDS: dict[str, BoardFetch] = {
    "greenhouse": greenhouse,
    "lever": lever,
    "ashby": ashby,
    "smartrecruiters": smartrecruiters,
    "recruitee": recruitee,
}


def make_fetch(ats: str):
    """The source adapter for one ATS: every configured company, politely."""
    board = BOARDS[ats]

    def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
        companies = config.get("companies") or []
        jobs: list[RawJob] = []
        failed: list[str] = []
        with client() as http:
            for company in companies:
                try:
                    jobs.extend(j for j in board(http, company["slug"], company["name"]) if j.url)
                except (httpx.HTTPError, ValueError, KeyError):
                    failed.append(company["slug"])
                pause()
        if companies and len(failed) == len(companies):
            raise RuntimeError(f"every {ats} board failed ({len(failed)})")
        note = f"boards that failed: {', '.join(failed)}"[:300] if failed else None
        return FetchResult(jobs, complete=bool(companies) and not failed, note=note)

    return fetch
