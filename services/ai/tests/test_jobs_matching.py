"""Matching: profile building, scoring signals, labels, re-rank input (no network)."""

from datetime import UTC, datetime, timedelta

import httpx
import pytest

from lynx_ai.jobs import embed, matching
from lynx_ai.jobs.matching import Profile, profile_from_rows, score_job

NOW = datetime(2026, 11, 27, tzinfo=UTC)

CANDIDATE = {
    "user_id": "11111111-1111-1111-1111-111111111111",
    "target_roles": ["Data Analyst"],
    "countries": ["AE", "DE"],
    "experience_level": "fresher",
    "education_level": "bachelors",
    "pathways": ["first_job"],
}
CV = {
    "basics": {"headline": "Graduate data analyst", "summary": "Synthetic test profile."},
    "skills": [{"name": "Data", "skills": ["SQL", "Python", "Tableau"]}],
    "projects": [{"name": "Dashboards", "technologies": ["Power BI", "SQL"]}],
    "experience": [{"title": "Data Intern", "company": "Example Co"}],
    "education": [{"degree": "BSc", "field": "Statistics", "institution": "Example University"}],
}


def job(**overrides):
    base = {
        "id": "j1",
        "title": "Junior Data Analyst",
        "company": "Acme",
        "field": "data_ai",
        "seniority": "entry",
        "employment_type": "full_time",
        "description": "You will write SQL and build Tableau dashboards.",
        "similarity": 0.5,
        "posted_at": NOW - timedelta(days=2),
    }
    return {**base, **overrides}


def test_profile_from_onboarding_cv_and_facts() -> None:
    profile = profile_from_rows(CANDIDATE, CV, ["Wants to work in fintech"])
    assert profile.skills == ["SQL", "Python", "Tableau", "Power BI"]
    assert profile.experience == ["Data Intern at Example Co"]
    assert profile.fields() == {"data_ai"}
    text = profile.text()
    assert "Target roles: Data Analyst" in text and "fintech" in text
    assert profile.hash() == profile_from_rows(CANDIDATE, CV, ["Wants to work in fintech"]).hash()
    assert profile.hash() != profile_from_rows(CANDIDATE, CV, []).hash()


def test_a_profile_without_a_cv_still_works() -> None:
    profile = profile_from_rows(CANDIDATE, None, [])
    assert profile.skills == [] and "Data Analyst" in profile.text()


def test_field_skills_and_level_raise_the_score() -> None:
    profile = profile_from_rows(CANDIDATE, CV, [])
    fields = profile.fields()
    good, signals = score_job(profile, fields, job(), NOW)
    assert signals == {"field": True, "skills": ["SQL", "Tableau"]}
    other_field, _ = score_job(profile, fields, job(field="sales", description=""), NOW)
    senior, _ = score_job(
        profile, fields, job(title="Senior Data Analyst", seniority="senior"), NOW
    )
    assert good > other_field and good > senior
    assert matching.label(good) in {"strong", "good"}


def test_internships_suit_students_not_experienced_people() -> None:
    student = Profile(user_id="s", level="student", pathways=["internship"])
    lead = Profile(user_id="l", level="lead")
    intern = job(employment_type="internship", seniority="entry")
    assert score_job(student, set(), intern, NOW)[0] > score_job(lead, set(), intern, NOW)[0]


def test_skills_match_whole_words_only() -> None:
    profile = Profile(user_id="x", skills=["R", "Go", "Excel"])
    hits = matching._skill_hits(profile.skills, job(description="Great organisational skills"))
    assert hits == []


def test_labels_and_template_reasons() -> None:
    assert [matching.label(s) for s in (0.7, 0.5, 0.35, 0.1)] == ["strong", "good", "partial", None]
    reason = matching.template_reason(job(), {"field": True, "skills": ["SQL", "Tableau"]})
    assert reason == "In your field (data and AI) and mentions SQL, Tableau."
    assert matching.template_reason(job(), {"field": False, "skills": []}).startswith("Similar")


def test_rerank_input_numbers_jobs_and_fences_data() -> None:
    profile = profile_from_rows(CANDIDATE, CV, [])
    prompt = matching.rerank_input(profile, [job(), job(title="Analyst", remote=True)])
    assert prompt.startswith("<profile>") and "</jobs>" in prompt
    assert (
        "1. Junior Data Analyst" in prompt and "2. Analyst" in prompt and "place: remote" in prompt
    )


def test_embeddings_request_and_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(embed.time, "sleep", lambda s: None)
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if len(calls) == 1:
            return httpx.Response(429)
        body = request.read().decode()
        assert '"dimensions":768' in body.replace(
            " ", ""
        ) and '"input_type":"query"' in body.replace(" ", "")
        return httpx.Response(
            200, json={"data": [{"index": 1, "embedding": [0.2]}, {"index": 0, "embedding": [0.1]}]}
        )

    http = httpx.Client(transport=httpx.MockTransport(handler))
    assert embed.embed(["a", "b"], "query", http, api_key="test") == [[0.1], [0.2]]
    assert len(calls) == 2
    assert embed.to_pgvector([0.5, -0.25]) == "[0.5,-0.25]"
    with pytest.raises(embed.EmbeddingError, match="NVIDIA_API_KEY"):
        monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
        embed.embed(["a"], "passage", http, api_key=None)
