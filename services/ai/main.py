"""Entry point. Vercel looks for a FastAPI instance named `app` in main.py.

Local development: `pnpm dev` (or `uv run python dev.py`).
"""

from lynx_ai.app import app

__all__ = ["app"]
