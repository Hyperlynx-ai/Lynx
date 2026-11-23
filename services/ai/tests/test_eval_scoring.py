from evals.cases import CASES
from evals.scoring import f1, same, score_cv


def test_a_perfect_parse_scores_one() -> None:
    for case in CASES:
        assert score_cv(case.expected(), case.expected())["overall"] == 1.0


def test_missed_and_invented_content_lower_the_score() -> None:
    expected = CASES[0].expected()
    worse = expected.model_copy(deep=True)
    worse.experience = worse.experience[:1]  # missed a job
    worse.skills[0].skills.append("Rust")  # invented a skill (AI-08)
    scores = score_cv(expected, worse)
    assert scores["experience"] < 1.0
    assert scores["skills"] < 1.0
    assert scores["basics"] == 1.0


def test_text_comparison_ignores_case_spacing_and_url_prefixes() -> None:
    assert same("Software  Engineer II", "software engineer ii")
    assert same("https://www.github.com/x/", "github.com/x")
    assert not same("B.Tech", "M.Tech in Physics")
    assert f1([], []) == 1.0
    assert f1(["Go"], []) == 0.0


def test_fixtures_exist_for_every_case() -> None:
    for case in CASES:
        assert case.fixture.is_file(), f"run `uv run python -m evals.render` ({case.name})"
