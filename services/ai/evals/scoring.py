"""How close a parsed CV is to the expected one, per section, from 0 to 1.

Text is compared after normalising case, spaces and trailing punctuation, and
near-identical strings (similarity >= 0.9) count as equal. Lists are scored
with F1, so both missed items and invented ones (AI-08) lower the score.
"""

import re
from collections.abc import Callable, Sequence
from difflib import SequenceMatcher

from lynx_ai.cv import CvData

SIMILAR = 0.9


def norm(value: str | None) -> str:
    text = re.sub(r"\s+", " ", (value or "").casefold()).strip()
    text = re.sub(r"^(https?://)?(www\.)?", "", text)
    return text.rstrip("./ ")


def same(a: str | None, b: str | None) -> bool:
    x, y = norm(a), norm(b)
    return x == y or (bool(x) and bool(y) and SequenceMatcher(None, x, y).ratio() >= SIMILAR)


def f1(expected: Sequence[str], actual: Sequence[str]) -> float:
    if not expected and not actual:
        return 1.0
    if not expected or not actual:
        return 0.0
    recall = sum(any(same(e, a) for a in actual) for e in expected) / len(expected)
    precision = sum(any(same(a, e) for e in expected) for a in actual) / len(actual)
    return 0.0 if recall + precision == 0 else 2 * recall * precision / (recall + precision)


def fields(expected: object, actual: object, names: Sequence[str]) -> float:
    return sum(same(getattr(expected, n), getattr(actual, n)) for n in names) / len(names)


def matched[T](
    expected: Sequence[T],
    actual: Sequence[T],
    key: Callable[[T], str | None],
    score: Callable[[T, T], float],
) -> float:
    """Pairs items by key (e.g. company), scores pairs, and penalises extra items."""
    if not expected and not actual:
        return 1.0
    if not expected or not actual:
        return 0.0
    total = 0.0
    for e in expected:
        partner = next((a for a in actual if same(key(e), key(a))), None)
        total += score(e, partner) if partner is not None else 0.0
    recall = total / len(expected)
    extra = sum(not any(same(key(a), key(e)) for e in expected) for a in actual)
    return recall * (len(actual) - extra) / len(actual)


def score_cv(expected: CvData, actual: CvData) -> dict[str, float]:
    eb, ab = expected.basics, actual.basics
    scores = {
        "basics": (
            fields(eb, ab, ["name", "headline", "email", "phone", "location", "summary"]) * 6
            + f1([link.url for link in eb.links], [link.url for link in ab.links])
        )
        / 7,
        "experience": matched(
            expected.experience,
            actual.experience,
            lambda job: job.company,
            lambda e, a: (
                (
                    fields(e, a, ["title", "company", "location", "start", "end"]) * 5
                    + f1(e.highlights, a.highlights) * 3
                )
                / 8
            ),
        ),
        "education": matched(
            expected.education,
            actual.education,
            lambda edu: edu.institution,
            lambda e, a: (
                (
                    fields(e, a, ["institution", "degree", "field", "start", "end", "grade"]) * 6
                    + f1(e.highlights, a.highlights)
                )
                / 7
            ),
        ),
        "projects": matched(
            expected.projects,
            actual.projects,
            lambda project: project.name,
            lambda e, a: (
                (
                    fields(e, a, ["name", "url", "start", "end"]) * 4
                    + f1(e.technologies, a.technologies)
                    + f1(e.highlights, a.highlights) * 2
                )
                / 7
            ),
        ),
        "skills": f1(
            [s for group in expected.skills for s in group.skills],
            [s for group in actual.skills for s in group.skills],
        ),
        "certifications": f1(
            [c.name for c in expected.certifications], [c.name for c in actual.certifications]
        ),
        "languages": f1(
            [f"{x.name} {x.level or ''}" for x in expected.languages],
            [f"{x.name} {x.level or ''}" for x in actual.languages],
        ),
        "achievements": f1(expected.achievements, actual.achievements),
    }
    scores["overall"] = sum(scores.values()) / len(scores)
    return {name: round(value, 3) for name, value in scores.items()}
