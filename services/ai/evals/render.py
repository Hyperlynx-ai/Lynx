"""Renders the synthetic eval CVs into PDF and DOCX files.

Run after changing a case: `uv run python -m evals.render`. The files are
committed, so evals don't depend on this script's output staying identical.
"""

from datetime import UTC, datetime
from typing import Literal

from lynx_ai.cv import CvData

from .cases import CASES

Kind = Literal["title", "subtitle", "contact", "heading", "entry", "meta", "bullet", "text"]
Block = tuple[Kind, str, str]


def _dates(start: str | None, end: str | None) -> str:
    return " - ".join(d for d in (start, end) if d)


def _join(*parts: str | None, sep: str = ", ") -> str:
    return sep.join(p for p in parts if p)


def blocks(cv: CvData, layout: str) -> list[Block]:
    """The CV as a list of simple blocks, in reading order."""
    b = cv.basics
    out: list[Block] = [("title", b.name or "", "")]
    if b.headline:
        out.append(("subtitle", b.headline, ""))
    links = [link.url for link in b.links]
    out.append(("contact", _join(b.email, b.phone, b.location, *links, sep="  |  "), ""))
    if b.summary:
        out.extend([("heading", "Profile", ""), ("text", b.summary, "")])

    def experience() -> None:
        if not cv.experience:
            return
        out.append(("heading", "Experience", ""))
        for job in cv.experience:
            out.append(
                ("entry", _join(job.title, job.company, sep=" | "), _dates(job.start, job.end))
            )
            if job.location:
                out.append(("meta", job.location, ""))
            out.extend(("bullet", h, "") for h in job.highlights)

    def education() -> None:
        if not cv.education:
            return
        out.append(("heading", "Education", ""))
        for edu in cv.education:
            degree = _join(edu.degree, edu.field, sep=" in ")
            out.append(
                ("entry", _join(degree, edu.institution, sep=" | "), _dates(edu.start, edu.end))
            )
            meta = _join(edu.location, edu.grade, sep="  |  ")
            if meta:
                out.append(("meta", meta, ""))
            out.extend(("bullet", h, "") for h in edu.highlights)

    if layout == "compact":
        education()
        experience()
    else:
        experience()
        education()

    if cv.projects:
        out.append(("heading", "Projects", ""))
        for project in cv.projects:
            out.append(("entry", project.name or "", _dates(project.start, project.end)))
            meta = _join(", ".join(project.technologies), project.url, sep="  |  ")
            if meta:
                out.append(("meta", meta, ""))
            out.extend(("bullet", h, "") for h in project.highlights)

    if cv.skills:
        out.append(("heading", "Skills", ""))
        for group in cv.skills:
            skills = ", ".join(group.skills)
            out.append(("text", f"{group.name}: {skills}" if group.name else skills, ""))

    if cv.certifications:
        out.append(("heading", "Certifications", ""))
        for cert in cv.certifications:
            out.append(("bullet", _join(cert.name, cert.issuer, cert.date, sep=" - "), ""))

    if cv.languages:
        out.append(("heading", "Languages", ""))
        langs = [
            f"{lang.name} ({lang.level})" if lang.level else lang.name for lang in cv.languages
        ]
        out.append(("text", ", ".join(langs), ""))

    if cv.achievements:
        out.append(("heading", "Achievements", ""))
        out.extend(("bullet", a, "") for a in cv.achievements)
    return out


def to_pdf(items: list[Block], layout: str) -> bytes:
    from fpdf import FPDF

    pdf = FPDF(format="A4")
    pdf.set_creation_date(datetime(2026, 1, 1, tzinfo=UTC))
    pdf.set_margins(18, 16, 18)
    pdf.set_auto_page_break(True, margin=16)
    pdf.add_page()
    size = 9.5 if layout == "compact" else 10.5
    line = 4.6 if layout == "compact" else 5.4
    for kind, text, right in items:
        if kind == "title":
            pdf.set_font("Helvetica", "B", 20)
            pdf.cell(0, 10, text, new_x="LMARGIN", new_y="NEXT")
        elif kind == "subtitle":
            pdf.set_font("Helvetica", "", 12)
            pdf.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        elif kind == "contact":
            pdf.set_font("Helvetica", "", size - 1)
            pdf.multi_cell(0, line, text, new_x="LMARGIN", new_y="NEXT")
        elif kind == "heading":
            pdf.ln(3)
            pdf.set_font("Helvetica", "B", size + 1)
            pdf.cell(0, line + 1, text.upper(), new_x="LMARGIN", new_y="NEXT")
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(1.5)
        elif kind == "entry":
            pdf.set_font("Helvetica", "B", size)
            pdf.cell(pdf.epw * 0.75, line, text)
            pdf.set_font("Helvetica", "", size)
            pdf.cell(0, line, right, align="R", new_x="LMARGIN", new_y="NEXT")
        elif kind == "meta":
            pdf.set_font("Helvetica", "I", size - 0.5)
            pdf.cell(0, line, text, new_x="LMARGIN", new_y="NEXT")
        elif kind == "bullet":
            pdf.set_font("Helvetica", "", size)
            pdf.set_x(pdf.l_margin + 3)
            pdf.multi_cell(0, line, f"- {text}", new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.set_font("Helvetica", "", size)
            pdf.multi_cell(0, line, text, new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())


def to_docx(items: list[Block]) -> bytes:
    import io

    from docx import Document
    from docx.shared import Pt

    document = Document()
    document.core_properties.created = datetime(2026, 1, 1, tzinfo=UTC)
    document.core_properties.author = "Hyperlynx evals"
    for kind, text, right in items:
        if kind == "title":
            document.add_heading(text, level=0)
        elif kind == "subtitle":
            document.add_paragraph(text).runs[0].font.size = Pt(13)
        elif kind == "contact":
            # Contact details in a table, as many Word CV templates do.
            parts = text.split("  |  ")
            table = document.add_table(rows=1, cols=len(parts))
            for cell, part in zip(table.rows[0].cells, parts, strict=True):
                cell.text = part
        elif kind == "heading":
            document.add_heading(text, level=1)
        elif kind == "entry":
            paragraph = document.add_paragraph()
            paragraph.add_run(text).bold = True
            if right:
                paragraph.add_run(f"\t{right}")
        elif kind == "meta":
            document.add_paragraph().add_run(text).italic = True
        elif kind == "bullet":
            document.add_paragraph(text, style="List Bullet")
        else:
            document.add_paragraph(text)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def main() -> None:
    for case in CASES:
        items = blocks(case.expected(), case.layout)
        data = to_docx(items) if case.fixture.suffix == ".docx" else to_pdf(items, case.layout)
        case.fixture.parent.mkdir(parents=True, exist_ok=True)
        case.fixture.write_bytes(data)
        print(f"wrote {case.fixture.relative_to(case.fixture.parents[2])} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
