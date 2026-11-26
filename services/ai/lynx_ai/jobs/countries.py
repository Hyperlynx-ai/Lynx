"""Where a job is: country (ISO 3166-1 alpha-2) and city from free text.

Lynx keeps jobs in the 35 countries candidates can choose (the same list as
packages/shared/src/candidate.ts) and remote jobs open to them (ADR 0011).
"""

import re

#: The 35 target countries: code -> names and spellings to recognize.
COUNTRY_NAMES: dict[str, list[str]] = {
    "AE": ["united arab emirates", "uae", "u.a.e", "emirates"],
    "SA": ["saudi arabia", "ksa", "kingdom of saudi arabia", "saudi"],
    "QA": ["qatar"],
    "OM": ["oman"],
    "KW": ["kuwait"],
    "BH": ["bahrain"],
    "DE": ["germany", "deutschland"],
    "NL": ["netherlands", "the netherlands", "holland", "nederland"],
    "IE": ["ireland"],
    "GB": ["united kingdom", "uk", "u.k.", "great britain", "england", "scotland", "wales"],
    "FR": ["france"],
    "BE": ["belgium", "belgique", "belgie"],
    "LU": ["luxembourg"],
    "AT": ["austria", "osterreich", "österreich"],
    "CH": ["switzerland", "schweiz", "suisse"],
    "PL": ["poland", "polska"],
    "CZ": ["czechia", "czech republic"],
    "SE": ["sweden", "sverige"],
    "FI": ["finland", "suomi"],
    "DK": ["denmark", "danmark"],
    "NO": ["norway", "norge"],
    "IT": ["italy", "italia"],
    "ES": ["spain", "espana", "españa"],
    "PT": ["portugal"],
    "EE": ["estonia", "eesti"],
    "MT": ["malta"],
    "CY": ["cyprus"],
    "SG": ["singapore"],
    "MY": ["malaysia"],
    "JP": ["japan"],
    "AU": ["australia"],
    "NZ": ["new zealand"],
    "CA": ["canada"],
    "US": ["united states", "united states of america", "usa", "u.s.", "u.s.a"],
    "IN": ["india", "bharat"],
}

#: Major cities -> country, for locations that only name a city.
CITIES: dict[str, str] = {
    # Gulf
    "dubai": "AE",
    "abu dhabi": "AE",
    "sharjah": "AE",
    "ajman": "AE",
    "al ain": "AE",
    "riyadh": "SA",
    "jeddah": "SA",
    "dammam": "SA",
    "khobar": "SA",
    "neom": "SA",
    "doha": "QA",
    "muscat": "OM",
    "kuwait city": "KW",
    "manama": "BH",
    # Europe
    "berlin": "DE",
    "munich": "DE",
    "münchen": "DE",
    "hamburg": "DE",
    "frankfurt": "DE",
    "cologne": "DE",
    "köln": "DE",
    "stuttgart": "DE",
    "düsseldorf": "DE",
    "dusseldorf": "DE",
    "leipzig": "DE",
    "dresden": "DE",
    "nuremberg": "DE",
    "hannover": "DE",
    "amsterdam": "NL",
    "rotterdam": "NL",
    "the hague": "NL",
    "utrecht": "NL",
    "eindhoven": "NL",
    "dublin": "IE",
    "cork": "IE",
    "galway": "IE",
    "london": "GB",
    "manchester": "GB",
    "edinburgh": "GB",
    "birmingham": "GB",
    "glasgow": "GB",
    "bristol": "GB",
    "leeds": "GB",
    "cambridge": "GB",
    "oxford": "GB",
    "belfast": "GB",
    "paris": "FR",
    "lyon": "FR",
    "toulouse": "FR",
    "marseille": "FR",
    "nice": "FR",
    "brussels": "BE",
    "antwerp": "BE",
    "ghent": "BE",
    "luxembourg city": "LU",
    "vienna": "AT",
    "wien": "AT",
    "graz": "AT",
    "linz": "AT",
    "zurich": "CH",
    "zürich": "CH",
    "geneva": "CH",
    "basel": "CH",
    "lausanne": "CH",
    "bern": "CH",
    "warsaw": "PL",
    "krakow": "PL",
    "kraków": "PL",
    "wroclaw": "PL",
    "wrocław": "PL",
    "gdansk": "PL",
    "prague": "CZ",
    "brno": "CZ",
    "stockholm": "SE",
    "gothenburg": "SE",
    "malmo": "SE",
    "malmö": "SE",
    "helsinki": "FI",
    "espoo": "FI",
    "tampere": "FI",
    "copenhagen": "DK",
    "aarhus": "DK",
    "oslo": "NO",
    "bergen": "NO",
    "milan": "IT",
    "milano": "IT",
    "rome": "IT",
    "turin": "IT",
    "madrid": "ES",
    "barcelona": "ES",
    "valencia": "ES",
    "seville": "ES",
    "malaga": "ES",
    "lisbon": "PT",
    "porto": "PT",
    "tallinn": "EE",
    "valletta": "MT",
    "limassol": "CY",
    "nicosia": "CY",
    # Asia-Pacific
    "kuala lumpur": "MY",
    "penang": "MY",
    "tokyo": "JP",
    "osaka": "JP",
    "sydney": "AU",
    "melbourne": "AU",
    "brisbane": "AU",
    "perth": "AU",
    "auckland": "NZ",
    "wellington": "NZ",
    # Americas
    "toronto": "CA",
    "vancouver": "CA",
    "montreal": "CA",
    "ottawa": "CA",
    "calgary": "CA",
    "new york": "US",
    "san francisco": "US",
    "seattle": "US",
    "boston": "US",
    "austin": "US",
    "chicago": "US",
    "los angeles": "US",
    # India
    "bengaluru": "IN",
    "bangalore": "IN",
    "mumbai": "IN",
    "delhi": "IN",
    "new delhi": "IN",
    "gurgaon": "IN",
    "gurugram": "IN",
    "noida": "IN",
    "hyderabad": "IN",
    "chennai": "IN",
    "pune": "IN",
    "kolkata": "IN",
    "ahmedabad": "IN",
    "kochi": "IN",
    "jaipur": "IN",
    "chandigarh": "IN",
    "indore": "IN",
    "coimbatore": "IN",
    "thiruvananthapuram": "IN",
}

#: US state codes, for locations like "Austin, TX".
_US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY", "DC",
}  # fmt: skip

#: Remote regions open to our candidates (no single country).
OPEN_REGIONS = [
    "worldwide",
    "anywhere",
    "global",
    "europe",
    "emea",
    "eu",
    "european union",
    "middle east",
    "mena",
    "gcc",
    "gulf",
    "apac",
    "asia",
    "asia pacific",
]

_ALIASES: list[tuple[re.Pattern[str], str]] = sorted(
    (
        (re.compile(rf"(?<![a-z]){re.escape(name)}(?![a-z])"), code)
        for code, names in COUNTRY_NAMES.items()
        for name in names
    ),
    key=lambda pair: -len(pair[0].pattern),
)
_CITY_PATTERNS = sorted(
    (
        (re.compile(rf"(?<![a-z]){re.escape(city)}(?![a-z])"), city, code)
        for city, code in CITIES.items()
    ),
    key=lambda item: -len(item[1]),
)
_REGION = re.compile(r"(?<![a-z])(" + "|".join(re.escape(r) for r in OPEN_REGIONS) + r")(?![a-z])")


def find_country(text: str | None) -> tuple[str | None, str | None]:
    """(country code, city) from a location string, or (None, None)."""
    if not text:
        return None, None
    lower = text.lower()
    city = next(
        ((name, code) for pattern, name, code in _CITY_PATTERNS if pattern.search(lower)), None
    )
    country = next((code for pattern, code in _ALIASES if pattern.search(lower)), None)
    if country is None and city:
        country = city[1]
    if country is None:
        # "Austin, TX" or "Toronto, ON"
        tail = re.search(r",\s*([A-Z]{2})\s*$", text.strip())
        if tail and tail.group(1) in _US_STATES:
            country = "US"
    city_name = city[0].title() if city and city[1] == country else None
    return country, city_name


def is_open_region(text: str | None) -> bool:
    """True for remote locations open to anyone or to our regions."""
    return bool(text and _REGION.search(text.lower()))
