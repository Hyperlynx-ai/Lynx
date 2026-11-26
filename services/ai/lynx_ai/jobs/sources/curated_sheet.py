"""The team's curated Google Sheet (Jobs and Opportunities tabs), chunk 3.3.

Read through Google's public "gviz" JSON endpoint (the sheet is shared as
"anyone with the link can view"). The sheet ID is configuration kept in the
`CURATED_SHEET_ID` secret (ADR 0011), not in the repository. Owner decision
2026-11-26: synced daily for now; a better approach comes later.

Columns: #, Program / Opportunity, Organisation / Host, Type, Host Country,
University / Institution, Area / Field, Funding, Mode, Eligibility, Typical
Deadline (verify), Official Link, Salary / Package (Jobs tab only).
"""

import hashlib
import json
import re
from collections.abc import Mapping
from datetime import UTC, date, datetime
from typing import Any
from urllib.parse import quote, quote_plus

import httpx

from ..normalize import RawJob
from . import FetchResult

DEFAULT_TABS = ["Jobs", "Opportunities"]

_TYPES = {
    "full-time job": "full_time",
    "internship": "internship",
    "funded research internship": "internship",
    "open-source stipend": "internship",
    "fellowship": "fellowship",
    "higher-ed scholarship": "scholarship",
    "exchange / semester": "scholarship",
    "research / academic": "full_time",
}
_MONTHS = {
    m: i + 1
    for i, m in enumerate(
        ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    )
}


def gviz_rows(text: str) -> list[dict[str, str]]:
    """Rows of a gviz JSON response as {column label: cell text}."""
    match = re.search(r"setResponse\((.*)\);?\s*$", text, re.S)
    if not match:
        raise ValueError("unexpected response from Google Sheets (is the sheet shared?)")
    data = json.loads(match.group(1))
    if data.get("status") != "ok":
        raise ValueError(f"Google Sheets answered {data.get('status')}")
    labels = [(c.get("label") or c.get("id") or "").strip() for c in data["table"]["cols"]]
    rows: list[dict[str, str]] = []
    for row in data["table"]["rows"]:
        cells = row.get("c") or []
        values = {}
        for label, cell in zip(labels, cells, strict=False):
            value = (cell or {}).get("f") or (cell or {}).get("v")
            if label and value not in (None, ""):
                values[label] = str(value).strip()
        if values:
            rows.append(values)
    return rows


def parse_deadline(text: str | None, today: date | None = None) -> date | None:
    """A date from "Jan 31", "31 Jan 2027", "2027-01-31"; None for "Rolling" etc."""
    if not text:
        return None
    today = today or datetime.now(UTC).date()
    t = text.lower()
    iso = re.search(r"(\d{4})-(\d{2})-(\d{2})", t)
    if iso:
        return date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))
    month_day = re.search(r"\b([a-z]{3})[a-z]*\.?\s+(\d{1,2})\b(?:,?\s*(\d{4}))?", t)
    day_month = re.search(r"\b(\d{1,2})\s+([a-z]{3})[a-z]*\.?(?:,?\s*(\d{4}))?", t)
    found = None
    if month_day and month_day.group(1) in _MONTHS:
        found = (_MONTHS[month_day.group(1)], int(month_day.group(2)), month_day.group(3))
    elif day_month and day_month.group(2) in _MONTHS:
        found = (_MONTHS[day_month.group(2)], int(day_month.group(1)), day_month.group(3))
    if not found:
        return None
    month, day, year = found
    try:
        if year:
            return date(int(year), month, day)
        # No year: the next time that date comes round.
        candidate = date(today.year, month, day)
        return candidate if candidate >= today else date(today.year + 1, month, day)
    except ValueError:
        return None


def to_raw_job(tab: str, row: Mapping[str, str]) -> RawJob | None:
    title = row.get("Program / Opportunity")
    if not title:
        return None
    org = row.get("Organisation / Host")
    kind = row.get("Type", "")
    link = row.get("Official Link", "")
    if not link.startswith("http"):
        # Some listings have no link: send people to a search for the program.
        link = f"https://www.google.com/search?q={quote_plus(' '.join(filter(None, [title, org])))}"
    location = row.get("Host Country")
    mode = row.get("Mode", "").lower()
    remote = "remote" in mode or "online" in mode
    deadline_text = row.get("Typical Deadline (verify)")
    details = [
        ("Type", kind),
        ("Institution", row.get("University / Institution")),
        ("Field", row.get("Area / Field") if row.get("Area / Field") != kind else None),
        ("Funding", row.get("Funding")),
        ("Mode", row.get("Mode")),
        ("Eligibility", row.get("Eligibility")),
        ("Typical deadline (verify)", deadline_text),
    ]
    description = "\n".join(f"{label}: {value}" for label, value in details if value)
    key = "|".join([tab, title, org or "", row.get("Official Link", "")])
    return RawJob(
        external_id=f"{tab.lower()}:{hashlib.sha1(key.encode()).hexdigest()[:20]}",
        url=link,
        title=title,
        company=org,
        location=location,
        description=description or None,
        remote=remote,
        employment_type=_TYPES.get(kind.lower()),
        categories=[c for c in [row.get("Area / Field"), kind] if c],
        salary_text=row.get("Salary / Package") or row.get("Funding"),
        deadline=parse_deadline(deadline_text),
        open_to_all=True,
    )


def fetch(config: Mapping[str, Any], env: Mapping[str, str]) -> FetchResult:
    sheet_id = env.get("CURATED_SHEET_ID", "").strip()
    if not sheet_id:
        raise RuntimeError("CURATED_SHEET_ID is not set")
    tabs = list(config.get("tabs") or DEFAULT_TABS)
    jobs: list[RawJob] = []
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        for tab in tabs:
            url = (
                f"https://docs.google.com/spreadsheets/d/{quote(sheet_id)}/gviz/tq"
                f"?tqx=out:json&sheet={quote(tab)}"
            )
            response = client.get(url)
            response.raise_for_status()
            jobs.extend(job for row in gviz_rows(response.text) if (job := to_raw_job(tab, row)))
    return FetchResult(jobs, complete=True)
