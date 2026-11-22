# 0003: AI layer: Pydantic AI + LiteLLM with a model registry

- Status: accepted
- Date: 2026-11-22
- Decided by: owner (Sujaan)

## Context

The owner wants something like the Vercel AI SDK, but in Python, that can
reach any model by API key, including Chinese and obscure providers.

## Decision

- **Pydantic AI** (MIT) for agents, tools, structured output, streaming and
  fallbacks.
- Providers it supports natively, plus **any OpenAI-compatible endpoint**
  (base URL + key), plus **LiteLLM** (MIT) for the long tail of 100+ providers.
- `services/ai/config/models.yaml` maps each task (CV parsing, ranking, chat,
  embeddings, ...) to a model and fallbacks. Environment variables can
  override a task's model. Feature code never names a model.
- The interview agent uses LiveKit's model plugins (see 0004) but reads its
  model choice from the same kind of config.
- First models: Google Gemini with the key from the prototype
  (`gemini-3.8-flash`, `gemini-embedding-2`, `gemini-3.8-live`), for synthetic
  and test data only until a paid key is in place (policy AI-02).

## Consequences

- Switching models is a config change plus an API key.
- Every call goes through one client that logs to `ai_calls` and enforces caps.
- Provider-specific features (for example realtime video) still need
  provider-aware code in the interview agent.
