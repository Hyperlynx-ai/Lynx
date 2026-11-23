"""Parsing-accuracy eval for the cv_parse task (policy AI-04).

Runs the real configured model (needs GOOGLE_API_KEY or the task's provider
key) on the synthetic CVs in evals/fixtures and scores each section.

    pnpm ai:eval            # from the repo root
    uv run python -m evals.cv_parse   # inside services/ai

Writes evals/results/cv_parse.json; commit it with any change to the cv_parse
prompt or model so reviewers see the effect. Exits with code 1 below the bar.
"""

import asyncio
import json
import sys
from dataclasses import dataclass
from datetime import UTC, datetime

from pydantic_evals import Case, Dataset
from pydantic_evals.dataset import increment_eval_metric, set_eval_attribute
from pydantic_evals.evaluators import Evaluator, EvaluatorContext

from lynx_ai.cv import CvData
from lynx_ai.cv_routes import cv_parse_input, get_cv_parse_agent, model_reads_pdf
from lynx_ai.registry import get_registry
from lynx_ai.tasks import run_task

from .cases import CASES, EVALS_DIR
from .scoring import score_cv

#: Average overall score a change must keep.
PASS_MARK = 0.9


@dataclass
class CvAccuracy(Evaluator[str, CvData]):
    def evaluate(self, ctx: EvaluatorContext[str, CvData]) -> dict[str, float]:
        assert ctx.expected_output is not None
        return score_cv(ctx.expected_output, ctx.output)


async def parse(case_name: str) -> CvData:
    case = next(c for c in CASES if c.name == case_name)
    data = case.fixture.read_bytes()
    user_input = cv_parse_input(data, case.media_type, native_pdf=model_reads_pdf("cv_parse"))
    parsed, usage = await run_task("cv_parse", get_cv_parse_agent(), user_input)
    set_eval_attribute("model", usage.model)
    increment_eval_metric("input_tokens", usage.input_tokens)
    increment_eval_metric("output_tokens", usage.output_tokens)
    return parsed.cv


async def main() -> int:
    dataset = Dataset[str, CvData, None](
        name="cv_parse",
        cases=[Case(name=c.name, inputs=c.name, expected_output=c.expected()) for c in CASES],
        evaluators=[CvAccuracy()],
    )
    # One at a time: free-tier keys have low rate limits.
    report = await dataset.evaluate(parse, max_concurrency=1, progress=False)
    report.print(include_input=False, include_output=False)

    results = {
        case.name: {
            "scores": {name: result.value for name, result in case.scores.items()},
            "model": case.attributes.get("model"),
            "input_tokens": case.metrics.get("input_tokens"),
            "output_tokens": case.metrics.get("output_tokens"),
            "duration_s": round(case.task_duration, 1),
        }
        for case in report.cases
    }
    failures = [failure.name for failure in report.failures]
    overall = [float(r["scores"]["overall"]) for r in results.values()]
    average = round(sum(overall) / len(CASES), 3) if overall else 0.0
    out = EVALS_DIR / "results" / "cv_parse.json"
    out.parent.mkdir(exist_ok=True)
    summary = {
        "date": datetime.now(UTC).date().isoformat(),
        "configured": get_registry().resolve("cv_parse").model,
        "average_overall": average,
        "pass_mark": PASS_MARK,
        "failed_cases": failures,
        "cases": results,
    }
    out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"\nAverage overall: {average} (pass mark {PASS_MARK}). Wrote {out.name}.")
    return 0 if average >= PASS_MARK and not failures else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
