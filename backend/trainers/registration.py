import importlib
import pkgutil


def register_all() -> None:
    """Import every trainer package so its module-level self-registration runs.

    Discovery is intentionally loose (import anything that looks like a trainer
    package); the gate is strict — a model only enters the registry if its own
    ``trainer`` module calls ``trainer_registry.register(...)`` on import.
    """
    import backend.trainers as trainers_pkg

    for mod in pkgutil.iter_modules(trainers_pkg.__path__):
        if mod.name in {"base", "registry", "configs"}:
            continue
        try:
            importlib.import_module(f"backend.trainers.{mod.name}.trainer")
        except ImportError:
            pass
