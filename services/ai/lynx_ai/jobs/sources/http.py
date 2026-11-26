"""A polite HTTP client for source adapters.

Identifies Hyperlynx, waits between pages, and retries rate limits and
server errors with back-off (honouring Retry-After). Never logs URLs: they
may carry API keys.
"""

import time
from typing import Any

import httpx

USER_AGENT = "HyperlynxBot/1.0 (job aggregator; +https://lynx-web-pi.vercel.app)"
#: Seconds to wait between paged requests to the same source.
PAGE_PAUSE = 1.0


def client(**kwargs: Any) -> httpx.Client:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    headers.update(kwargs.pop("headers", {}))
    return httpx.Client(timeout=45, follow_redirects=True, headers=headers, **kwargs)


def get_json(
    http: httpx.Client, url: str, *, params: dict[str, Any] | None = None, tries: int = 3, **kw: Any
) -> Any:
    """GET and parse JSON, retrying 429 and 5xx up to `tries` times."""
    for attempt in range(tries):
        response = http.get(url, params=params, **kw)
        if response.status_code == 429 or response.status_code >= 500:
            if attempt == tries - 1:
                response.raise_for_status()
            retry_after = response.headers.get("Retry-After", "")
            wait = float(retry_after) if retry_after.isdigit() else 5.0 * (attempt + 1)
            time.sleep(min(wait, 60))
            continue
        response.raise_for_status()
        return response.json()
    raise RuntimeError("unreachable")


def pause() -> None:
    time.sleep(PAGE_PAUSE)
