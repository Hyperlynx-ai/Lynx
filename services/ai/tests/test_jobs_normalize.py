from datetime import date

import pytest

from lynx_ai.jobs.countries import find_country
from lynx_ai.jobs.normalize import RawJob, clean_text, dedupe_key, detect_field, normalize


@pytest.mark.parametrize(
    ("location", "country", "city"),
    [
        ("Dubai, United Arab Emirates", "AE", "Dubai"),
        ("Abu Dhabi", "AE", "Abu Dhabi"),
        ("Berlin, Germany", "DE", "Berlin"),
        ("München", "DE", "München"),
        ("Bengaluru, Karnataka, India", "IN", "Bengaluru"),
        ("Austin, TX", "US", "Austin"),
        ("Plano, TX", "US", None),
        ("Indianapolis, IN", "US", None),
        ("Remote - UK", "GB", None),
        ("São Paulo, Brazil", None, None),
        ("Ukraine", None, None),
        ("Indiana", None, None),
        ("US, WA, Seattle", "US", "Seattle"),
        ("GB, London", "GB", "London"),
        ("JP, 13, Tokyo", "JP", "Tokyo"),
        ("BR, SP, Sao Paulo", None, None),
        ("Liverpool L7 8YE", "GB", None),
        ("Remote from the US", "US", None),
    ],
)
def test_find_country(location: str, country: str | None, city: str | None) -> None:
    assert find_country(location) == (country, city)


def raw(**kwargs: object) -> RawJob:
    base: dict[str, object] = {
        "external_id": "1",
        "url": "https://example.test/1",
        "title": "Backend Engineer",
    }
    return RawJob(**{**base, **kwargs})  # type: ignore[arg-type]


def test_keeps_target_countries_and_open_remote_jobs() -> None:
    assert normalize(raw(location="Dubai")) is not None
    assert normalize(raw(location="Remote", remote=True)) is not None
    assert normalize(raw(location="Anywhere in the world")) is not None
    assert normalize(raw(location="Remote (Europe only)", remote=True)) is not None
    europe = normalize(raw(location="Remote - EMEA", remote=True))
    assert europe is not None and europe.country is None and europe.remote


def test_drops_jobs_outside_the_target_countries() -> None:
    assert normalize(raw(location="Lagos, Nigeria")) is None
    assert normalize(raw(location="Remote, Brazil", remote=True)) is None
    assert normalize(raw(location="Remote - LATAM only", remote=True)) is None
    assert normalize(raw(location=None)) is None  # not remote and nowhere


def test_classifies_type_seniority_and_field() -> None:
    nurse = normalize(raw(title="Senior Staff Nurse - ICU", location="Riyadh"))
    assert nurse is not None
    assert (nurse.field, nurse.seniority, nurse.country) == ("healthcare", "senior", "SA")

    intern = normalize(
        raw(title="Data Analyst Intern", location="Pune", employment_type="Full-time")
    )
    assert intern is not None
    assert (intern.employment_type, intern.seniority, intern.field) == (
        "internship",
        "entry",
        "data_ai",
    )

    grant = normalize(
        raw(title="DAAD Masters Scholarship", location="Germany", deadline=date(2027, 1, 31))
    )
    assert grant is not None
    assert (grant.employment_type, grant.field) == ("scholarship", "education")

    contract = normalize(
        raw(title="DevOps Engineer", location="Amsterdam", employment_type="contract")
    )
    assert contract is not None
    assert (contract.employment_type, contract.field) == ("contract", "cloud_devops")


def test_field_uses_categories_when_the_title_is_vague() -> None:
    assert detect_field("Associate", "Marketing, SEO, Content") == "marketing"
    assert detect_field("Something unusual", "") == "other"


def test_cleans_html_descriptions() -> None:
    text = clean_text("<p>We build <b>payments</b>&nbsp;APIs.</p><ul><li>Go</li><li>SQL</li></ul>")
    assert text == "We build payments APIs.\n\n- Go\n- SQL"


def test_the_same_job_from_two_sources_has_the_same_key() -> None:
    assert dedupe_key("Backend Engineer", "Acme GmbH", "DE") == dedupe_key(
        " backend engineer ", "ACME GmbH", "DE"
    )
    assert dedupe_key("Backend Engineer", "Acme", "DE") != dedupe_key(
        "Backend Engineer", "Acme", "AE"
    )


def test_curated_listings_open_to_all_are_kept_without_a_country() -> None:
    assert normalize(raw(title="Global Fellowship", location="Global")) is None
    kept = normalize(raw(title="Global Fellowship", location="International", open_to_all=True))
    assert kept is not None and kept.country is None and not kept.remote
    assert normalize(raw(location="Lagos, Nigeria", open_to_all=True)) is None


def test_the_same_title_in_two_towns_is_two_jobs() -> None:
    seattle = normalize(raw(title="Area Manager II", company="Acme", location="US, WA, Seattle"))
    arlington = normalize(
        raw(title="Area Manager II", company="Acme", location="US, VA, Arlington")
    )
    assert seattle is not None and arlington is not None
    assert seattle.dedupe_key != arlington.dedupe_key
