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
| Parsing-accuracy eval (real model, needs a key) | `uv run python -m evals.cv_parse` (or `pnpm ai:eval` from the root) |

## Structure

```
main.py               entry point (Vercel looks for `app` here; keep the name)
lynx_ai/
  app.py              FastAPI app, /health and /v1/ping
  cv_routes.py        /v1/cv/* (cv_parse)
  cv.py               CvData, the structured CV (mirror: packages/shared/src/cv.ts)
  files.py            download from signed Storage URLs, DOCX/PDF to text
  tasks.py            make_agent / run_task: model + prompt + usage report
  registry.py         task -> model mapping (reads config/models.yaml)
  settings.py         settings from the environment (+ .env.local locally)
  security.py         service-token check for every non-health route
  prompts.py          loads prompts from prompts/
config/models.yaml    which model runs each task (PROTECTED AREA)
prompts/              versioned prompts, one Markdown file per task
evals/                synthetic eval cases, rendered fixtures, scorers, results
tests/                pytest tests (never call real providers)
```

## Adding an AI task

1. Add the task to `config/models.yaml` (owner approval) and its daily cap to
   `apps/api/src/modules/ai/caps.ts`.
2. Write `prompts/<task>.md`.
3. Build the agent with `make_agent("<task>", OutputModel)` and run it with
   `run_task(...)`, which returns the output and the usage that `apps/api`
   logs. Never name a model in feature code (policy AI-01).
4. Expose it on a route with `Depends(require_service_token)` and a
   dependency that returns the agent, so tests can override it.
5. Add an eval under `evals/` when the output quality matters (AI-04).

## Providers

- Pydantic AI providers: `"<provider>:<model>"`, e.g. `google:gemini-3.6-flash`,
  `openai:...`, `anthropic:...`, `deepseek:...`, `openrouter:vendor/model`,
  `ollama:...`. Install the provider's extra with
  `uv add "pydantic-ai-slim[<provider>]"` and set its API key variable.
- Any OpenAI-compatible endpoint (Qwen, Kimi, GLM, MiniMax, self-hosted, a
  LiteLLM proxy...): declare it under `providers:` in `models.yaml` and use
  `"compat:<name>/<model>"`. These models get document text instead of files.
- Per-environment override without a code change:
  `LYNX_MODEL_<TASK>="primary,fallback1"`.

## Rules

- Every route except `/health` depends on `require_service_token`.
- Tests never call real providers: use `TestModel` or `FunctionModel` and
  FastAPI dependency overrides (see `tests/test_app.py`, `tests/test_cv.py`).
- Changing a prompt, model or ranking needs an eval result (policy AI-04):
  run the eval and commit `evals/results/*.json` with the change.
- No personal data in logs, fixtures or eval sets.
