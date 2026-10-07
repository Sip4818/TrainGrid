"""Thin async HTTP client over the TrainGrid API.

The MCP service must talk to ``http://api:8000`` over HTTP only and never
import SQLAlchemy models or API services directly. This keeps the layer
boundary in ``docs/architecture.md`` intact (MCP is another client, like the
frontend API client).
"""

from __future__ import annotations

import os

import httpx


def get_api_base_url() -> str:
    """Return the TrainGrid API base URL (compose service name by default)."""
    return os.getenv("TRAINGRID_API_URL", "http://api:8000").rstrip("/")


def get_api_timeout() -> float:
    """Return the HTTP timeout in seconds."""
    try:
        return float(os.getenv("TRAINGRID_API_TIMEOUT", "10.0"))
    except ValueError:
        return 10.0


class TrainGridClient:
    """Minimal async wrapper used by MCP tools (expanded in later slices)."""

    def __init__(
        self,
        base_url: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url or get_api_base_url(),
            timeout=timeout if timeout is not None else get_api_timeout(),
        )

    async def health(self) -> dict[str, object]:
        """Check API liveness via ``GET /health``."""
        response = await self._client.get("/health")
        response.raise_for_status()
        data: dict[str, object] = response.json()
        return data

    async def aclose(self) -> None:
        await self._client.aclose()
