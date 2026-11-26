import json
from datetime import date

import pytest

from lynx_ai.jobs.normalize import normalize
from lynx_ai.jobs.sources import ADAPTERS
from lynx_ai.jobs.sources.curated_sheet import fetch, gviz_rows, parse_deadline, to_raw_job

COLUMNS = [
    "#",
    "Program / Opportunity",
    "Organisation / Host",
    "Type",
    "Host Country",
    "University / Institution",
    "Area / Field",
    "Funding",
    "Mode",
    "Eligibility",
    "Typical Deadline (verify)",
    "Official Link",
    "Salary / Package",
]


def gviz(rows: list[list[object]]) -> str:
    """A synthetic gviz response, shaped like Google's."""
    table = {
        "cols": [{"id": chr(65 + i), "label": c, "type": "string"} for i, c in enumerate(COLUMNS)],
        "rows": [{"c": [None if v is None else {"v": v} for v in r]} for r in rows],
    }
    body = {"version": "0.6", "status": "ok", "table": table}
    return f"/*O_o*/\ngoogle.visualization.Query.setResponse({json.dumps(body)});"


SHEET = gviz(
    [
        [1, "Software Engineer", "Example Corp", "Full-time Job", "US, WA, Seattle", None,
         "Full-time Job", "Paid", "On-site", None, "Rolling", "https://example.test/jobs/1",
         "$150k-$180k"],
        [2, "Example Masters Scholarship", "Example Foundation", "Higher-Ed Scholarship",
         "International", "Any university", "Any", "Fully funded", "On-site",
         "Students from developing countries", "Jan 31", "", None],
        [3, "Summer Research Internship", "Example Institute", "Funded Research Internship",
         "Germany", "Example University", "STEM research", "Stipend", "Remote/Hybrid", None,
         "Typically spring", "https://example.test/intern", None],
        [None, None, None, None, None, None, None, None, None, None, None, None, None],
    ]
)  # fmt: skip


def test_reads_gviz_rows() -> None:
    rows = gviz_rows(SHEET)
    assert len(rows) == 3
    assert rows[0]["Program / Opportunity"] == "Software Engineer"
    with pytest.raises(ValueError):
        gviz_rows("<html>Sign in</html>")


def test_maps_rows_to_jobs() -> None:
    job, scholarship, intern = (to_raw_job("Opportunities", r) for r in gviz_rows(SHEET))
    assert job is not None and scholarship is not None and intern is not None

    assert (job.employment_type, job.salary_text) == ("full_time", "$150k-$180k")
    normalized = normalize(job)
    assert normalized is not None
    assert (normalized.country, normalized.city) == ("US", "Seattle")

    # No link: people get a search for the program instead.
    assert scholarship.url.startswith("https://www.google.com/search?q=Example+Masters")
    assert scholarship.employment_type == "scholarship"
    assert scholarship.deadline is not None and (
        scholarship.deadline.month,
        scholarship.deadline.day,
    ) == (1, 31)
    assert "Eligibility: Students from developing countries" in (scholarship.description or "")
    kept = normalize(scholarship)  # "International": open to all, kept without a country
    assert kept is not None and kept.country is None

    assert (intern.employment_type, intern.remote, intern.deadline) == ("internship", True, None)

    # Stable ids: the same row gets the same id on the next sync.
    assert job.external_id == to_raw_job("Opportunities", gviz_rows(SHEET)[0]).external_id  # type: ignore[union-attr]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Jan 31", date(2027, 1, 31)),
        ("Dec 15", date(2026, 12, 15)),
        ("31 March 2027", date(2027, 3, 31)),
        ("2027-02-01", date(2027, 2, 1)),
        ("Rolling", None),
        ("Varies - verify", None),
        ("Typically Sep", None),
        ("Feb 30", None),
    ],
)
def test_parses_deadlines(text: str, expected: date | None) -> None:
    assert parse_deadline(text, today=date(2026, 11, 26)) == expected


def test_needs_the_sheet_id_secret() -> None:
    with pytest.raises(RuntimeError, match="CURATED_SHEET_ID"):
        fetch({}, {})
    assert "curated_sheet" in ADAPTERS
