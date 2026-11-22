"""Prompts are versioned Markdown files in services/ai/prompts/ (policy AI-03)."""

from functools import lru_cache

from .settings import get_settings


@lru_cache
def load_prompt(name: str) -> str:
    path = get_settings().prompts_dir / f"{name}.md"
    return path.read_text(encoding="utf-8").strip()
