"""Hyperlynx AI service: AI tasks, job ingestion and matching for Lynx."""

import os

# Pydantic AI prints an observability banner on first use; keep logs clean.
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

__version__ = "0.1.0"
