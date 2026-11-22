"""Entry point. Vercel looks for a FastAPI instance named `app` in main.py.

Local development: `pnpm dev` (or `uv run uvicorn main:app --reload --port 8000`).
"""

from lynx_ai.app import app

__all__ = ["app"]
