"""Model registry: which model runs each AI task (policy AI-01).

Feature code never names a model. It asks the registry for a task, e.g.
`get_registry().build("cv_parse")`, and gets a Pydantic AI model (with
fallbacks) chosen in config/models.yaml or overridden by an environment
variable `LYNX_MODEL_<TASK>="primary,fallback1,fallback2"`.
"""

import os
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic_ai.models import Model
from pydantic_ai.models.fallback import FallbackModel

from .settings import get_settings


@dataclass(frozen=True)
class TaskModels:
    task: str
    model: str
    fallbacks: tuple[str, ...] = ()


class ModelRegistry:
    def __init__(self, tasks: Mapping[str, TaskModels]):
        self._tasks = dict(tasks)

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
        return cls(tasks)

    @property
    def tasks(self) -> list[str]:
        return sorted(self._tasks)

    def resolve(self, task: str, environ: Mapping[str, str] = os.environ) -> TaskModels:
        """The models for a task, after applying any LYNX_MODEL_<TASK> override."""
        override = environ.get(f"LYNX_MODEL_{task.upper()}", "").strip()
        if override:
            names = [n.strip() for n in override.split(",") if n.strip()]
            return TaskModels(task=task, model=names[0], fallbacks=tuple(names[1:]))
        try:
            return self._tasks[task]
        except KeyError:
            known = ", ".join(self.tasks) or "none"
            raise KeyError(f"No model configured for task '{task}'. Known tasks: {known}") from None

    def build(self, task: str) -> Model | str:
        """A Pydantic AI model for the task: a model name, or a FallbackModel chain."""
        chosen = self.resolve(task)
        if not chosen.fallbacks:
            return chosen.model
        return FallbackModel(chosen.model, *chosen.fallbacks)


@lru_cache
def get_registry() -> ModelRegistry:
    return ModelRegistry.from_file(get_settings().models_file)
