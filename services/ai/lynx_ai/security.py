"""Only apps/api (and the scheduler) may call this service (policy SEC-05)."""

import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from .settings import Settings, get_settings


def require_service_token(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    expected = settings.ai_service_token
    if not expected:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI_SERVICE_TOKEN is not set")
    supplied = (authorization or "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(supplied.encode(), expected.encode()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid service token")
