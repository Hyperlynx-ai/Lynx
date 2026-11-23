from pathlib import Path

import pytest
from pydantic_ai.models.fallback import FallbackModel

from lynx_ai.registry import CompatProvider, ModelRegistry, Price, TaskModels
from lynx_ai.settings import get_settings


def test_shipped_config_is_valid() -> None:
    registry = ModelRegistry.from_file(get_settings().models_file)
    assert "ping" in registry.task_names
    assert ":" in registry.resolve("ping").model  # "<provider>:<model>"


def test_environment_override_wins() -> None:
    registry = ModelRegistry({"chat": TaskModels("chat", "google:a", ("google:b",))})
    chosen = registry.resolve("chat", environ={"LYNX_MODEL_CHAT": "openai:x, deepseek:y"})
    assert chosen == TaskModels("chat", "openai:x", ("deepseek:y",))


def test_unknown_task_is_a_clear_error() -> None:
    with pytest.raises(KeyError, match="No model configured for task 'nope'"):
        ModelRegistry({}).resolve("nope", environ={})


def test_task_without_model_is_rejected(tmp_path: Path) -> None:
    config = tmp_path / "models.yaml"
    config.write_text("tasks:\n  broken: {}\n", encoding="utf-8")
    with pytest.raises(ValueError, match="needs a 'model'"):
        ModelRegistry.from_file(config)


def test_fallbacks_build_a_fallback_chain(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_API_KEY", "dummy-key-for-construction-only")
    registry = ModelRegistry({"chat": TaskModels("chat", "google:gemini-a", ("google:gemini-b",))})
    assert isinstance(registry.build("chat"), FallbackModel)
    single = ModelRegistry({"chat": TaskModels("chat", "google:gemini-a")})
    assert single.build("chat") == "google:gemini-a"


def test_compat_provider_builds_an_openai_compatible_model(monkeypatch: pytest.MonkeyPatch) -> None:
    from pydantic_ai.models.openai import OpenAIChatModel

    registry = ModelRegistry(
        tasks={"chat": TaskModels("chat", "compat:qwen/qwen-max")},
        providers={"qwen": CompatProvider("qwen", "https://example.test/v1", "QWEN_API_KEY")},
    )
    with pytest.raises(ValueError, match="set the QWEN_API_KEY"):
        registry.model_for("compat:qwen/qwen-max", environ={})
    model = registry.model_for("compat:qwen/qwen-max", environ={"QWEN_API_KEY": "test"})
    assert isinstance(model, OpenAIChatModel)
    assert model.model_name == "qwen-max"


def test_unknown_compat_provider_is_a_clear_error() -> None:
    with pytest.raises(ValueError, match="declare provider 'nope'"):
        ModelRegistry(tasks={}).model_for("compat:nope/x", environ={})


def test_cost_estimate_uses_configured_prices() -> None:
    registry = ModelRegistry(tasks={}, prices={"google:m": Price(0.5, 2.0)})
    assert registry.estimate_cost("google:m", 1_000_000, 500_000) == 1.5
    assert registry.estimate_cost("m", 2_000_000, 0) == 1.0  # provider prefix optional
    assert registry.estimate_cost("other", 10, 10) is None
