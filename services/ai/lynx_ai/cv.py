"""The structured CV (`CvData`, ADR 0010).

Mirrored as zod in packages/shared/src/cv.ts. Both sides are tested against
packages/shared/fixtures/cv-sample.json, so change all three together.

Rules for every field: keep the candidate's own words and facts; dates are
free text exactly as written ("Jan 2023", "2021 - Present"); unknown values
are null or empty lists, never guesses (policy AI-08).
"""

from pydantic import BaseModel, Field


class Link(BaseModel):
    label: str | None = Field(default=None, description="e.g. LinkedIn, GitHub, Portfolio")
    url: str


class Basics(BaseModel):
    name: str | None = None
    headline: str | None = Field(
        default=None, description="Short professional title, e.g. 'Backend engineer'"
    )
    email: str | None = None
    phone: str | None = None
    location: str | None = Field(default=None, description="City and country as written")
    links: list[Link] = Field(default_factory=list)
    summary: str | None = Field(default=None, description="The profile or summary paragraph")


class Experience(BaseModel):
    title: str | None = None
    company: str | None = None
    location: str | None = None
    start: str | None = None
    end: str | None = Field(default=None, description="As written, e.g. 'Present'")
    highlights: list[str] = Field(default_factory=list, description="One bullet point each")


class Education(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field: str | None = Field(default=None, description="Field of study")
    location: str | None = None
    start: str | None = None
    end: str | None = None
    grade: str | None = Field(default=None, description="GPA, CGPA, percentage or class")
    highlights: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str | None = None
    url: str | None = None
    start: str | None = None
    end: str | None = None
    technologies: list[str] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)


class SkillGroup(BaseModel):
    name: str | None = Field(default=None, description="Group title, e.g. 'Languages'")
    skills: list[str] = Field(default_factory=list)


class Certification(BaseModel):
    name: str
    issuer: str | None = None
    date: str | None = None
    url: str | None = None


class Language(BaseModel):
    name: str
    level: str | None = Field(default=None, description="As written, e.g. 'Native', 'B2'")


class CvData(BaseModel):
    basics: Basics = Field(default_factory=Basics)
    experience: list[Experience] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    skills: list[SkillGroup] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    languages: list[Language] = Field(default_factory=list)
    achievements: list[str] = Field(
        default_factory=list, description="Awards and achievements, one each"
    )


class ParsedCv(BaseModel):
    """What the cv_parse task returns."""

    is_cv: bool = Field(
        description="False if the document is clearly not a CV or resume (e.g. an invoice)"
    )
    cv: CvData = Field(default_factory=CvData)
