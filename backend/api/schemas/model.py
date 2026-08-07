from typing import Any

from pydantic import BaseModel


class TrainerInfo(BaseModel):
    """Descriptor of a registered trainer exposed to clients."""

    name: str
    label: str
    config_schema: dict[str, Any]
