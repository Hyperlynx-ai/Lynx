"""Model registry: which model runs each AI task (policy AI-01).

Feature code never names a model. It asks the registry for a task, e.g.
`get_registry().build("cv_parse")`, and gets a Pydantic AI model (with
fallbacks) chosen in config/models.yaml or overridden by an environment
variable `LYNX_MODEL_<TASK>="primary,fallback1,fallback2"`.

Model strings:
- "<provider>:<model>" for providers Pydantic AI knows (google, openai,
  anthropic, deepseek, mistral, groq, openrouter, ollama, ...);
- "compat:<name>/<model>" for any OpenAI-compatible endpoint declared under
  `providers:` in models.yaml (base URL + the env var holding its key).
"""

import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic_ai.models import Model
from pydantic_ai.models.fallback import FallbackModel

from .settings import get_settings

COMPAT_PREFIX = "compat:"


@dataclass(frozen=True)
class TaskModels:
    task: str
    model: str
    fallbacks: tuple[str, ...] = ()


@dataclass(frozen=True)
class CompatProvider:
    """An OpenAI-compatible endpoint (DeepSeek, Qwen, Kimi, GLM, self-hosted, ...)."""

    name: str
    base_url: str
    api_key_env: str


@dataclass(frozen=True)
class Price:
    """US dollars per million tokens, for cost estimates in ai_calls."""

    input_per_mtok: float
    output_per_mtok: float


@dataclass
class ModelRegistry:
    tasks: Mapping[str, TaskModels]
    providers: Mapping[str, CompatProvider] = field(default_factory=dict)
    prices: Mapping[str, Price] = field(default_factory=dict)

    @classmethod
    def from_file(cls, path: Path) -> "ModelRegistry":
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        tasks: dict[str, TaskModels] = {}
        for name, spec in (data.get("tasks") or {}).items():
            if not isinstance(spec, dict) or not spec.get("model"):
                raise ValueError(f"{path}: task '{name}' needs a 'model'")
            tasks[name] = TaskModels(
                task=name,
                model=str(spec["model"]),
                fallbacks=tuple(str(m) for m in spec.get("fallbacks") or ()),
            )
        providers: dict[str, CompatProvider] = {}
        for name, spec in (data.get("providers") or {}).items():
            if (
                not isinstance(spec, dict)
                or not spec.get("base_url")
                or not spec.get("api_key_env")
            ):
                raise ValueError(f"{path}: provider '{name}' needs 'base_url' and 'api_key_env'")
            providers[name] = CompatProvider(name, str(spec["base_url"]), str(spec["api_key_env"]))
        prices = {
            str(model): Price(float(p["input_per_mtok"]), float(p["output_per_mtok"]))
            for model, p in (data.get("prices") or {}).items()
        }
        return cls(tasks=tasks, providers=providers, prices=prices)

    @property
    def task_names(self) -> list[str]:
        return sorted(self.tasks)

    def resolve(self, task: str, environ: Mapping[str, str] = os.environ) -> TaskModels:
        """The models for a task, after applying any LYNX_MODEL_<TASK> override."""
        override = environ.get(f"LYNX_MODEL_{task.upper()}", "").strip()
        if override:
            names = [n.strip() for n in override.split(",") if n.strip()]
            return TaskModels(task=task, model=names[0], fallbacks=tuple(names[1:]))
        try:
            return self.tasks[task]
        except KeyError:
            known = ", ".join(self.task_names) or "none"
            raise KeyError(f"No model configured for task '{task}'. Known tasks: {known}") from None

    def model_for(self, name: str, environ: Mapping[str, str] = os.environ) -> Model | str:
        """Turns one model string into something Pydantic AI can run."""
        if not name.startswith(COMPAT_PREFIX):
            return name
        provider_name, _, model_name = name[len(COMPAT_PREFIX) :].partition("/")
        provider = self.providers.get(provider_name)
        if provider is None or not model_name:
            raise ValueError(f"'{name}': declare provider '{provider_name}' under providers:")
        from pydantic_ai.models.openai import OpenAIChatModel
        from pydantic_ai.providers.openai import OpenAIProvider

        api_key = environ.get(provider.api_key_env)
        if not api_key:
            raise ValueError(f"'{name}': set the {provider.api_key_env} environment variable")
        return OpenAIChatModel(
            model_name, provider=OpenAIProvider(base_url=provider.base_url, api_key=api_key)
        )

    def build(self, task: str) -> Model | str:
        """A Pydantic AI model for the task: one model, or a FallbackModel chain."""
        chosen = self.resolve(task)
        primary = self.model_for(chosen.model)
        if not chosen.fallbacks:
            return primary
        return FallbackModel(primary, *(self.model_for(m) for m in chosen.fallbacks))

    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float | None:
        """Estimated US dollars for a call, if a price is configured for the model."""
        # Providers report bare names ("gemini-3.8-flash"); prices may be keyed
        # with the provider prefix ("google:gemini-3.8-flash"), or not.
        bare = model.split(":", 1)[-1]
        price = self.prices.get(model) or next(
            (p for key, p in self.prices.items() if key.split(":", 1)[-1] == bare), None
        )
        if price is None:
            return None
        cost = input_tokens * price.input_per_mtok + output_tokens * price.output_per_mtok
        return round(cost / 1_000_000, 6)


@lru_cache
def get_registry() -> ModelRegistry:
    return ModelRegistry.from_file(get_settings().models_file)
