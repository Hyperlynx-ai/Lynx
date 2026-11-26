"""Turning a source's raw posting into Lynx's job shape (ADR 0011).

Every source adapter returns `RawJob`s; `normalize` cleans and classifies
them the same way: country and city, remote, employment type, seniority,
field of work, salary, plain-text description and the de-duplication key.
Values match the check constraints in supabase/migrations/*_jobs.sql.
"""

import hashlib
import html
import re
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

from .countries import find_country, is_open_region

EMPLOYMENT_TYPES = (
    "full_time",
    "part_time",
    "contract",
    "internship",
    "scholarship",
    "fellowship",
    "temporary",
)

#: Fields of work and the words that suggest them (title words count 3x).
#: Based on the prototype's domains (references/Hyperlynx/js/jobs.js),
#: re-implemented, plus hospitality and education.
FIELDS: dict[str, list[str]] = {
    "cybersecurity": [
        "security",
        "cybersecurity",
        "cyber",
        "penetration",
        "pentest",
        "vulnerability",
        "owasp",
        "soc",
        "siem",
        "threat",
        "infosec",
        "malware",
        "forensic",
        "appsec",
        "incident response",
        "firewall",
        "grc",
        "red team",
        "blue team",
    ],
    "software": [
        "software",
        "developer",
        "programming",
        "backend",
        "back-end",
        "frontend",
        "front-end",
        "full-stack",
        "full stack",
        "java",
        "python",
        "javascript",
        "typescript",
        "react",
        "node",
        "golang",
        "web development",
        "android",
        "ios",
        "sde",
        "django",
        "spring",
        ".net",
        "php",
        "ruby",
        "mobile developer",
    ],
    "data_ai": [
        "data",
        "analyst",
        "analytics",
        "sql",
        "machine learning",
        "ml",
        "ai",
        "artificial intelligence",
        "deep learning",
        "nlp",
        "tableau",
        "power bi",
        "data science",
        "data scientist",
        "llm",
        "statistics",
        "bi",
    ],
    "cloud_devops": [
        "cloud",
        "aws",
        "azure",
        "gcp",
        "devops",
        "kubernetes",
        "docker",
        "ci/cd",
        "infrastructure",
        "sre",
        "site reliability",
        "linux",
        "terraform",
        "sysadmin",
        "platform engineer",
    ],
    "product_project": [
        "product manager",
        "product management",
        "product owner",
        "project manager",
        "program manager",
        "scrum master",
        "agile coach",
        "delivery manager",
    ],
    "marketing": [
        "marketing",
        "seo",
        "content",
        "social media",
        "brand",
        "growth",
        "campaign",
        "copywriter",
        "copywriting",
        "communications",
        "public relations",
        "pr manager",
    ],
    "sales": [
        "sales",
        "business development",
        "lead generation",
        "account executive",
        "account manager",
        "partnerships",
        "bdr",
        "sdr",
        "inside sales",
    ],
    "finance": [
        "finance",
        "financial",
        "accounting",
        "accountant",
        "audit",
        "auditor",
        "tax",
        "investment",
        "banking",
        "equity",
        "treasury",
        "cfa",
        "fp&a",
        "bookkeeping",
        "controller",
        "actuary",
    ],
    "hr": [
        "hr",
        "human resources",
        "recruitment",
        "recruiter",
        "talent acquisition",
        "payroll",
        "people operations",
        "people partner",
    ],
    "operations": [
        "operations",
        "strategy",
        "consulting",
        "consultant",
        "supply chain",
        "logistics",
        "procurement",
        "business analyst",
        "operations manager",
    ],
    "design": [
        "design",
        "designer",
        "ui",
        "ux",
        "figma",
        "graphic",
        "creative",
        "video editor",
        "animation",
        "illustrator",
    ],
    "core_engineering": [
        "mechanical",
        "civil",
        "electrical",
        "electronics",
        "manufacturing",
        "cad",
        "embedded",
        "robotics",
        "automotive",
        "construction",
        "hvac",
        "structural",
        "chemical engineer",
        "process engineer",
        "quality engineer",
    ],
    "healthcare": [
        "clinical",
        "nurse",
        "nursing",
        "medical",
        "pharma",
        "pharmacy",
        "pharmacist",
        "biotech",
        "healthcare",
        "physician",
        "doctor",
        "dentist",
        "therapist",
        "radiographer",
        "laboratory",
        "research scientist",
    ],
    "customer_support": [
        "customer support",
        "customer success",
        "customer service",
        "helpdesk",
        "help desk",
        "support engineer",
        "call center",
        "technical support",
    ],
    "hospitality": [
        "hotel",
        "hospitality",
        "chef",
        "cook",
        "restaurant",
        "barista",
        "waiter",
        "front desk",
        "housekeeping",
        "tourism",
        "travel",
        "food and beverage",
        "f&b",
    ],
    "education": [
        "teacher",
        "teaching",
        "tutor",
        "lecturer",
        "professor",
        "education",
        "curriculum",
        "phd",
        "postdoc",
        "scholarship",
        "fellowship",
        "academic",
    ],
}


def _word_patterns(words: list[str]) -> list[re.Pattern[str]]:
    return [re.compile(rf"(?<![a-z0-9]){re.escape(w)}(?![a-z0-9])") for w in words]


_FIELD_PATTERNS = {name: _word_patterns(words) for name, words in FIELDS.items()}
_TAG = re.compile(r"<[^>]+>")
_SPACE = re.compile(r"[ \t\r\f\v ]+")
_ONLY_REMOTE = re.compile(r"\W*(fully\s+|100%\s+)?remote(\s+(job|position|role|work))?\W*", re.I)


@dataclass
class RawJob:
    """What a source adapter returns (strings as the source has them)."""

    external_id: str
    url: str
    title: str
    company: str | None = None
    location: str | None = None
    description: str | None = None
    remote: bool | None = None
    employment_type: str | None = None
    #: Words the source uses for the field (category, tags, department).
    categories: list[str] = field(default_factory=list)
    salary_text: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    posted_at: datetime | None = None
    deadline: date | None = None


@dataclass
class Job:
    """A normalized job, ready to store."""

    external_id: str
    url: str
    title: str
    company: str | None
    location: str | None
    country: str | None
    city: str | None
    remote: bool
    employment_type: str | None
    seniority: str | None
    field: str
    description: str | None
    salary_text: str | None
    salary_min: float | None
    salary_max: float | None
    salary_currency: str | None
    posted_at: datetime | None
    deadline: date | None
    dedupe_key: str


def clean_text(value: str | None, limit: int = 20_000) -> str | None:
    """Plain text from HTML or text: tags removed, entities decoded, spaces tidied."""
    if not value:
        return None
    text = re.sub(r"<\s*(br|/p|/h\d|/div|/ul|/ol)\s*/?>", "\n", value, flags=re.I)
    text = re.sub(r"<\s*li[^>]*>", "\n- ", text, flags=re.I)
    text = html.unescape(_TAG.sub(" ", text))
    lines = [_SPACE.sub(" ", line).strip() for line in text.splitlines()]
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    return text[:limit] or None


def detect_field(title: str, other: str) -> str:
    """The field of work whose words appear most (title words count 3x)."""
    title_l, other_l = title.lower(), other.lower()
    best, best_score = "other", 0.0
    for name, patterns in _FIELD_PATTERNS.items():
        score = sum(
            3 * min(len(p.findall(title_l)), 2) + min(len(p.findall(other_l)), 3) for p in patterns
        )
        if score > best_score:
            best, best_score = name, score
    return best


def detect_seniority(title: str) -> str | None:
    t = title.lower()
    if re.search(r"intern|fresher|entry|graduate|trainee|junior|\bjr\b|apprentice|associate", t):
        return "entry"
    if re.search(r"senior|\bsr\b|lead|principal|head of|director|manager|architect|staff\b", t):
        return "senior"
    if re.search(r"mid[- ]level|\bii\b|\b2\b", t):
        return "mid"
    return None


def detect_type(raw: RawJob) -> str | None:
    given = (raw.employment_type or "").lower().replace("-", "_").replace(" ", "_")
    words = f"{raw.title} {given}".lower()
    if "scholarship" in words:
        return "scholarship"
    if "fellowship" in words:
        return "fellowship"
    if re.search(r"intern(ship)?\b|trainee|apprentice", words):
        return "internship"
    if given in EMPLOYMENT_TYPES:
        return given
    if re.search(r"part[_ ]?time", words):
        return "part_time"
    if re.search(r"contract|freelance|contractor", words):
        return "contract"
    if re.search(r"temporary|temp\b|seasonal", words):
        return "temporary"
    if re.search(r"full[_ ]?time|permanent", words):
        return "full_time"
    return None


def dedupe_key(title: str, company: str | None, country: str | None) -> str:
    """Same title + company + country = same job, whatever the source."""
    norm = " ".join(
        re.sub(r"[^a-z0-9]+", " ", f"{title}|{company or ''}|{country or ''}".lower()).split()
    )
    return hashlib.sha256(norm.encode()).hexdigest()[:32]


def normalize(raw: RawJob) -> Job | None:
    """The normalized job, or None if it's out of scope (ADR 0011: the 35
    target countries plus remote jobs open to them)."""
    title = (clean_text(raw.title, 300) or "").replace("\n", " ").strip()
    if not title or not raw.url:
        return None
    description = clean_text(raw.description)
    location = (clean_text(raw.location, 300) or "").replace("\n", " ").strip() or None
    country, city = find_country(location)
    remote = bool(raw.remote) or bool(
        location and re.search(r"remote|anywhere|worldwide", location, re.I)
    )
    only_remote = location is None or bool(_ONLY_REMOTE.fullmatch(location))
    if country is None and not (remote and (only_remote or is_open_region(location))):
        return None
    other = " ".join([*raw.categories, description or ""])[:5000]
    posted = raw.posted_at
    if posted and posted.tzinfo is None:
        posted = posted.replace(tzinfo=UTC)
    return Job(
        external_id=raw.external_id[:300],
        url=raw.url[:2000],
        title=title,
        company=(clean_text(raw.company, 200) or None),
        location=location,
        country=country,
        city=city,
        remote=remote,
        employment_type=detect_type(raw),
        seniority=detect_seniority(title),
        field=detect_field(title, other),
        description=description,
        salary_text=(raw.salary_text or "").strip()[:200] or None,
        salary_min=raw.salary_min,
        salary_max=raw.salary_max,
        salary_currency=(raw.salary_currency or "").upper()[:3] or None,
        posted_at=posted,
        deadline=raw.deadline,
        dedupe_key=dedupe_key(title, raw.company, country),
    )
