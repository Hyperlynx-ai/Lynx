"""Eval cases: synthetic CVs only, never real people's data (policy PRIV-01).

Each case is the expected structured CV (JSON) plus a file rendered from it
by `python -m evals.render` and committed under evals/fixtures/.
"""

import json
from dataclasses import dataclass
from pathlib import Path

from lynx_ai.cv import CvData
from lynx_ai.files import DOCX, PDF

EVALS_DIR = Path(__file__).resolve().parent
REPO = EVALS_DIR.parents[2]


@dataclass(frozen=True)
class CvCase:
    name: str
    expected_file: Path
    fixture: Path
    media_type: str
    #: Visual layout used by render.py, so the model sees more than one style.
    layout: str

    def expected(self) -> CvData:
        return CvData.model_validate(json.loads(self.expected_file.read_text(encoding="utf-8")))


CASES = [
    CvCase(
        "aarav-sharma-pdf",
        REPO / "packages" / "shared" / "fixtures" / "cv-sample.json",
        EVALS_DIR / "fixtures" / "aarav-sharma.pdf",
        PDF,
        "classic",
    ),
    CvCase(
        "meera-nair-docx",
        EVALS_DIR / "cases" / "meera-nair.json",
        EVALS_DIR / "fixtures" / "meera-nair.docx",
        DOCX,
        "classic",
    ),
    CvCase(
        "rohan-verma-pdf",
        EVALS_DIR / "cases" / "rohan-verma.json",
        EVALS_DIR / "fixtures" / "rohan-verma.pdf",
        PDF,
        "compact",
    ),
]
