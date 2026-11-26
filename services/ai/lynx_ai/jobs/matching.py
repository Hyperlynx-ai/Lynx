"""Matching candidates to jobs (chunk 3.7, ADR 0011).

For each onboarded candidate:
1. build a profile from the onboarding answers, the matching CV and Lynx's
   facts, and embed it (only again when it changed);
2. take the 300 nearest visible jobs in the candidate's countries (or
   remote without a country) by embedding similarity;
3. score them: similarity, field of work, skills named in the job, and
   seniority fit (the prototype's signals), freshness;
4. let the AI re-rank the top 30 and write a one-line reason for each;
5. keep the top 100 in job_matches.

Candidate data goes to the AI provider: test data only until KL-05 is
resolved. Prints counts only (workflow logs are public).
"""

import asyncio
import hashlib
import json
import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import Engine, text

from .embed import MODEL, embed, to_pgvector
from .normalize import detect_field

#: How many jobs are scored, re-ranked by the AI, and kept per candidate.
CANDIDATES_POOL = 300
RERANK_TOP = 30
KEEP = 100

FIELD_LABELS = {
    "cybersecurity": "cybersecurity",
    "software": "software",
    "data_ai": "data and AI",
    "cloud_devops": "cloud and DevOps",
    "product_project": "product and projects",
    "marketing": "marketing",
    "sales": "sales",
    "finance": "finance",
    "hr": "HR",
    "operations": "operations",
    "design": "design",
    "core_engineering": "engineering",
    "healthcare": "healthcare",
    "customer_support": "customer support",
    "hospitality": "hospitality",
    "education": "education",
}

EARLY = {"student", "fresher", "junior"}
EXPERIENCED = {"senior", "lead"}


@dataclass
class Profile:
    user_id: str
    roles: list[str] = field(default_factory=list)
    countries: list[str] = field(default_factory=list)
    level: str | None = None
    education_level: str | None = None
    pathways: list[str] = field(default_factory=list)
    headline: str | None = None
    summary: str | None = None
    skills: list[str] = field(default_factory=list)
    experience: list[str] = field(default_factory=list)
    education: list[str] = field(default_factory=list)
    facts: list[str] = field(default_factory=list)

    def text(self) -> str:
        """What gets embedded and shown to the re-ranker."""
        lines = [
            f"Target roles: {', '.join(self.roles)}" if self.roles else "",
            f"Experience level: {self.level}" if self.level else "",
            f"Education level: {self.education_level}" if self.education_level else "",
            f"Pathways: {', '.join(self.pathways)}" if self.pathways else "",
            f"Countries: {', '.join(self.countries)}" if self.countries else "",
            f"Headline: {self.headline}" if self.headline else "",
            f"Summary: {self.summary[:500]}" if self.summary else "",
            f"Skills: {', '.join(self.skills[:40])}" if self.skills else "",
            "Experience: " + "; ".join(self.experience[:6]) if self.experience else "",
            "Education: " + "; ".join(self.education[:3]) if self.education else "",
            "Notes: " + "; ".join(self.facts[:15]) if self.facts else "",
        ]
        return "\n".join(line for line in lines if line)

    def hash(self) -> str:
        return hashlib.sha256(f"{MODEL}\n{self.text()}".encode()).hexdigest()

    def fields(self) -> set[str]:
        """Fields of work the candidate is after (from roles, else experience)."""
        found = {detect_field(role, "") for role in self.roles}
        if not found - {"other"}:
            found |= {detect_field(item, "") for item in self.experience[:3]}
        return found - {"other"}


def _strings(values: Iterable[Any]) -> list[str]:
    return [str(v).strip() for v in values if isinstance(v, str) and v.strip()]


def profile_from_rows(candidate: dict[str, Any], cv: dict[str, Any] | None, facts: list[str]):
    cv = cv or {}
    basics = cv.get("basics") or {}
    skills: list[str] = []
    for group in cv.get("skills") or []:
        skills += _strings((group or {}).get("skills") or [])
    for project in cv.get("projects") or []:
        skills += _strings((project or {}).get("technologies") or [])
    experience = [
        " at ".join(_strings([e.get("title"), e.get("company")]))
        for e in cv.get("experience") or []
        if isinstance(e, dict) and (e.get("title") or e.get("company"))
    ]
    education = [
        ", ".join(_strings([e.get("degree"), e.get("field"), e.get("institution")]))
        for e in cv.get("education") or []
        if isinstance(e, dict)
    ]
    return Profile(
        user_id=str(candidate["user_id"]),
        roles=_strings(candidate.get("target_roles") or []),
        countries=_strings(candidate.get("countries") or []),
        level=candidate.get("experience_level"),
        education_level=candidate.get("education_level"),
        pathways=_strings(candidate.get("pathways") or []),
        headline=basics.get("headline"),
        summary=basics.get("summary"),
        skills=list(dict.fromkeys(skills)),
        experience=[e for e in experience if e],
        education=[e for e in education if e],
        facts=facts,
    )


def _skill_hits(skills: list[str], job: dict[str, Any]) -> list[str]:
    """The candidate's skills the job names (whole words)."""
    haystack = f"{job.get('title') or ''}\n{job.get('description') or ''}".lower()
    hits = []
    for skill in skills:
        s = skill.lower().strip()
        if len(s) < 2 or len(s) > 40:
            continue
        if re.search(rf"(?<![a-z0-9]){re.escape(s)}(?![a-z0-9])", haystack):
            hits.append(skill)
    return hits[:6]


def score_job(profile: Profile, fields: set[str], job: dict[str, Any], now: datetime):
    """Score 0..1 and what it's made of."""
    similarity = float(job["similarity"])
    sim = min(1.0, max(0.0, (similarity - 0.15) / 0.4))
    in_field = 1.0 if job.get("field") in fields else 0.0
    hits = _skill_hits(profile.skills, job)
    skills = min(1.0, len(hits) / 3)
    score = 0.55 * sim + 0.25 * in_field + 0.2 * skills

    level, seniority = profile.level, job.get("seniority")
    if level in EARLY and seniority == "senior":
        score *= 0.55
    elif level in EXPERIENCED and seniority == "entry":
        score *= 0.7
    elif level == "mid" and seniority == "senior":
        score *= 0.85
    elif level in EARLY and seniority == "entry":
        score *= 1.1
    if "internship" in profile.pathways and job.get("employment_type") == "internship":
        score *= 1.15
    elif (
        job.get("employment_type") == "internship"
        and level not in {"student", "fresher"}
        and "internship" not in profile.pathways
    ):
        score *= 0.6
    posted = job.get("posted_at") or job.get("first_seen_at")
    if posted and now - posted < timedelta(days=7):
        score *= 1.05
    return min(1.0, score), {"field": bool(in_field), "skills": hits}


def label(score: float) -> str | None:
    if score >= 0.6:
        return "strong"
    if score >= 0.45:
        return "good"
    if score >= 0.3:
        return "partial"
    return None


def template_reason(job: dict[str, Any], signals: dict[str, Any]) -> str:
    parts = []
    if signals.get("field") and job.get("field") in FIELD_LABELS:
        parts.append(f"In your field ({FIELD_LABELS[job['field']]})")
    if signals.get("skills"):
        parts.append(f"mentions {', '.join(signals['skills'][:3])}")
    if not parts:
        return "Similar to the roles and experience in your profile."
    reason = " and ".join(parts)
    return reason[0].upper() + reason[1:] + "."


class RerankItem(BaseModel):
    job: int = Field(description="The job's number in the list")
    fit: int = Field(ge=0, le=100)
    reason: str = Field(max_length=300)


class Rerank(BaseModel):
    items: list[RerankItem]


def rerank_input(profile: Profile, jobs: list[dict[str, Any]]) -> str:
    listing = []
    for i, job in enumerate(jobs, 1):
        where = "remote" if job.get("remote") else (job.get("location") or job.get("country") or "")
        bits = [
            f"{i}. {job['title']}",
            f"company: {job.get('company') or 'unknown'}",
            f"place: {where}",
            f"field: {job.get('field')}",
            f"level: {job.get('seniority') or 'not stated'}",
            f"type: {job.get('employment_type') or 'not stated'}",
        ]
        description = " ".join((job.get("description") or "").split())[:400]
        listing.append(" | ".join(bits) + (f"\n   {description}" if description else ""))
    return f"<profile>\n{profile.text()}\n</profile>\n\n<jobs>\n" + "\n".join(listing) + "\n</jobs>"


async def ai_rerank(profile: Profile, jobs: list[dict[str, Any]]) -> dict[int, RerankItem]:
    """The AI's fit and reason per job number (1-based); invalid numbers dropped."""
    from ..tasks import make_agent, run_task

    output, _usage = await run_task(
        "job_rerank", make_agent("job_rerank", Rerank), rerank_input(profile, jobs)
    )
    return {item.job: item for item in output.items if 1 <= item.job <= len(jobs)}


@dataclass
class MatchSummary:
    candidates: int = 0
    matched: int = 0
    reranked: int = 0
    failed: int = 0


class Matcher:
    def __init__(self, engine: Engine) -> None:
        self.engine = engine

    def candidates(self, requested_only: bool) -> list[str]:
        where = "c.onboarded_at is not null"
        if requested_only:
            where += " and s.requested_at is not null"
        with self.engine.connect() as conn:
            rows = conn.execute(
                text(
                    "select c.user_id from public.candidates c left join"
                    " public.candidate_match_state s using (user_id)"
                    f" where {where} order by s.requested_at nulls last"
                )
            )
            return [str(r[0]) for r in rows]

    def profile(self, user_id: str) -> tuple[Profile, dict[str, Any]]:
        with self.engine.connect() as conn:
            candidate = dict(
                conn.execute(
                    text("select * from public.candidates where user_id = :id"), {"id": user_id}
                )
                .mappings()
                .one()
            )
            cv = conn.execute(
                text(
                    # The CV chosen for matching, else the latest general version.
                    "select v.data from public.cv_versions v where v.user_id = :id"
                    " and (v.id = :chosen or v.source <> 'tailored')"
                    " order by (v.id = :chosen) desc nulls last, v.created_at desc limit 1"
                ),
                {"id": user_id, "chosen": candidate.get("matching_cv_version_id")},
            ).scalar()
            facts = [
                r[0]
                for r in conn.execute(
                    text(
                        "select text from public.lynx_facts where user_id = :id and category in"
                        " ('skill', 'goal', 'preference', 'certification', 'language')"
                        " order by created_at desc limit 15"
                    ),
                    {"id": user_id},
                )
            ]
            state = (
                conn.execute(
                    text(
                        "select profile_hash, embedding::text as embedding, requested_at"
                        " from public.candidate_match_state where user_id = :id"
                    ),
                    {"id": user_id},
                )
                .mappings()
                .first()
            )
        data = cv if isinstance(cv, dict) else (json.loads(cv) if cv else None)
        return profile_from_rows(candidate, data, facts), dict(state or {})

    def nearest_jobs(self, profile: Profile, vector: str) -> list[dict[str, Any]]:
        countries = profile.countries
        with self.engine.connect() as conn:
            rows = conn.execute(
                text(
                    "select id, title, company, location, country, remote, field, seniority,"
                    " employment_type, posted_at, first_seen_at, left(description, 2000)"
                    " as description,"
                    " 1 - (embedding <=> cast(:q as extensions.halfvec)) as similarity"
                    " from public.jobs where status = 'active' and duplicate_of is null"
                    " and embedding is not null"
                    # Remote jobs tied to another country usually need residency there.
                    " and (cardinality(cast(:countries as text[])) = 0"
                    "      or country = any(cast(:countries as text[]))"
                    "      or (remote and country is null))"
                    " order by embedding <=> cast(:q as extensions.halfvec) limit :pool"
                ),
                {"q": vector, "countries": countries, "pool": CANDIDATES_POOL},
            ).mappings()
            return [dict(r) for r in rows]

    def save(
        self,
        user_id: str,
        started: datetime,
        profile_hash: str,
        vector: str,
        ranked: list[dict[str, Any]],
        error: str | None,
    ) -> None:
        with self.engine.begin() as conn:
            conn.execute(
                text("delete from public.job_matches where user_id = :id"), {"id": user_id}
            )
            if ranked:
                conn.execute(
                    text(
                        "insert into public.job_matches"
                        " (user_id, job_id, rank, score, label, reason, reranked)"
                        " values (:user_id, :job_id, :rank, :score, :label, :reason, :reranked)"
                    ),
                    [
                        {
                            "user_id": user_id,
                            "job_id": m["id"],
                            "rank": rank,
                            "score": round(m["score"], 4),
                            "label": label(m["score"]),
                            "reason": m["reason"][:300],
                            "reranked": m["reranked"],
                        }
                        for rank, m in enumerate(ranked, 1)
                    ],
                )
            conn.execute(
                text(
                    "insert into public.candidate_match_state"
                    " (user_id, profile_hash, embedding, matched_at, matches, last_error)"
                    " values (:id, :hash, cast(:e as extensions.halfvec), now(), :n, :error)"
                    " on conflict (user_id) do update set profile_hash = excluded.profile_hash,"
                    " embedding = excluded.embedding, matched_at = now(),"
                    " matches = excluded.matches, last_error = excluded.last_error,"
                    # A request that came in while we worked stays pending.
                    " requested_at = case when candidate_match_state.requested_at <= :started"
                    " then null else candidate_match_state.requested_at end"
                ),
                {
                    "id": user_id,
                    "hash": profile_hash,
                    "e": vector,
                    "n": len(ranked),
                    "error": error,
                    "started": started,
                },
            )

    def record_failure(self, user_id: str) -> None:
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    "insert into public.candidate_match_state (user_id, last_error)"
                    " values (:id, 'matching failed') on conflict (user_id)"
                    " do update set last_error = 'matching failed'"
                ),
                {"id": user_id},
            )

    def match(self, user_id: str, use_ai: bool = True) -> tuple[int, bool]:
        """Matches one candidate. Returns (matches kept, whether the AI re-ranked)."""
        started = datetime.now(UTC)
        profile, state = self.profile(user_id)
        profile_hash = profile.hash()
        if state.get("profile_hash") == profile_hash and state.get("embedding"):
            vector = str(state["embedding"])
        else:
            vector = to_pgvector(embed([profile.text()], "query")[0])

        fields = profile.fields()
        scored = []
        for job in self.nearest_jobs(profile, vector):
            score, signals = score_job(profile, fields, job, started)
            scored.append({**job, "score": score, "signals": signals})
        scored.sort(key=lambda j: j["score"], reverse=True)

        error = None
        reranked = False
        top = scored[:RERANK_TOP]
        if use_ai and top:
            try:
                verdicts = asyncio.run(ai_rerank(profile, top))
                for i, job in enumerate(top, 1):
                    if verdict := verdicts.get(i):
                        job["score"] = 0.5 * job["score"] + 0.5 * verdict.fit / 100
                        job["reason"], job["reranked"] = verdict.reason.strip(), True
                reranked = bool(verdicts)
            except Exception:  # the AI is optional: keep the computed ranking
                error = "AI re-ranking unavailable; ranked without it"
        for job in scored:
            job.setdefault("reason", template_reason(job, job["signals"]))
            job.setdefault("reranked", False)
        kept = sorted(scored, key=lambda j: j["score"], reverse=True)[:KEEP]
        self.save(user_id, started, profile_hash, vector, kept, error)
        return len(kept), reranked

    def run(self, requested_only: bool, use_ai: bool = True) -> MatchSummary:
        summary = MatchSummary()
        for user_id in self.candidates(requested_only):
            summary.candidates += 1
            try:
                kept, reranked = self.match(user_id, use_ai)
            except Exception:  # one candidate must not stop the others; no details logged
                summary.failed += 1
                self.record_failure(user_id)
                continue
            summary.matched += 1 if kept else 0
            summary.reranked += 1 if reranked else 0
        return summary
