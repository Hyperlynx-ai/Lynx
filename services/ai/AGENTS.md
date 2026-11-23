# services/ai: agent guide

The Python AI service (FastAPI, Pydantic AI). Internal only: `apps/api` calls
it with a service token. The root `AGENTS.md` still applies, especially the
AI and privacy rules in `docs/policies/04-data-privacy-and-ai.md`.

## Commands

Run from the repo root (`pnpm dev` starts it on http://localhost:4500), or
inside `services/ai`:

| What | Command |
|---|---|
| Install / update dependencies | `uv sync` |
| Run the service | `uv run uvicorn main:app --reload --port 4500` |
| Tests | `uv run pytest` |
| Lint and format | `uv run ruff check .` and `uv run ruff format .` |
| Types | `uv run pyright` |
| Add a dependency | `uv add <package>` (explain it in the PR, policy DEP-02) |

## Structure

```
main.py               entry point (Vercel looks for `app` here; keep the name)
lynx_ai/
  app.py              FastAPI app and routes
  settings.py         settings from the environment (+ .env.local locally)
  security.py         service-token check for every non-health route
  registry.py         task -> model mapping (reads config/models.yaml)
  prompts.py          loads prompts from prompts/
config/models.yaml    which model runs each task (PROTECTED AREA)
prompts/              versioned prompts, one Markdown file per task
tests/                pytest tests
```

## Using a model

Never name a model in feature code (policy AI-01). Add a task to
`config/models.yaml` (owner approval), then:

```python
from pydantic_ai import Agent
from lynx_ai.prompts import load_prompt
from lynx_ai.registry import get_registry

agent = Agent(get_registry().build("cv_parse"), instructions=load_prompt("cv_parse"))
result = await agent.run(text)
```

## Switching or adding providers

- Pydantic AI providers are used as `"<provider>:<model>"` strings, e.g.
  `google:gemini-3.8-flash`, `openai:...`, `anthropic:...`, `deepseek:...`,
  `openrouter:vendor/model`, `ollama:...`. Install the provider's extra with
  `uv add "pydantic-ai-slim[<provider>]"` and set its API key variable.
- Any OpenAI-compatible endpoint (many Chinese and niche providers): build an
  `OpenAIChatModel` with `OpenAIProvider(base_url=..., api_key=...)` in
  `registry.py`, keyed by a provider name in `models.yaml`.
- The long tail (100+ providers): LiteLLM, added in chunk 2.1.
- Per-environment override without a code change:
  `LYNX_MODEL_<TASK>="primary,fallback1"`.

## Rules

- Every route except `/health` depends on `require_service_token`.
- Tests never call real providers: use `pydantic_ai.models.test.TestModel`
  and FastAPI dependency overrides (see `tests/test_app.py`).
- Changing a prompt, model or ranking needs an eval result (policy AI-04).
- No personal data in logs, fixtures or eval sets.
