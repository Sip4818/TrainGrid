"""Thin async HTTP client over the TrainGrid API.

The MCP service must talk to ``http://api:8000`` over HTTP only and never
import SQLAlchemy models or API services directly. This keeps the layer
boundary in ``docs/architecture.md`` intact (MCP is another client, like the
frontend API client).
"""

from __future__ import annotations

import os
from typing import Any

import httpx


def get_api_base_url() -> str:
    """Return the TrainGrid API base URL (compose service name by default)."""
    return os.getenv("TRAINGRID_API_URL", "http://api:8000").rstrip("/")


def get_api_timeout() -> float:
    """Return the HTTP timeout in seconds."""
    try:
        return float(os.getenv("TRAINGRID_API_TIMEOUT", "30.0"))
    except ValueError:
        return 30.0


class TrainGridAPIError(Exception):
    """API failure with the backend's error code and HTTP status preserved.

    The API returns ``{"detail": {"code": ..., "message": ...}}`` with status
    codes mapped in ``backend/api/core/exceptions.py`` (e.g.
    ``TRAINER_NOT_FOUND`` → 422, ``NOT_FOUND`` → 404,
    ``RUN_NOT_IN_EXPERIMENT`` → 422). Preserving both lets MCP callers and
    the Inspector tests distinguish failure reasons.
    """

    def __init__(self, code: str, message: str, status: int) -> None:
        super().__init__(f"{code} (HTTP {status}): {message}")
        self.code = code
        self.message = message
        self.status = status


class TrainGridClient:
    """Thin async wrapper over the TrainGrid API (no DB imports allowed)."""

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

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, object] | None = None,
    ) -> Any:
        """Send a request, raising ``TrainGridAPIError`` on API failures."""
        try:
            response = await self._client.request(
                method, path, params=params, json=json
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise self._parse_api_error(exc.response) from exc
        return response.json()

    @staticmethod
    def _parse_api_error(response: httpx.Response) -> TrainGridAPIError:
        """Extract the backend's ``detail.code``/``detail.message`` if present."""
        try:
            detail: object = response.json().get("detail", {})
        except ValueError:
            detail = {}
        if isinstance(detail, dict):
            code = str(detail.get("code", "API_ERROR"))
            message = str(detail.get("message", response.text))
        else:
            code = "API_ERROR"
            message = str(detail) or response.text
        return TrainGridAPIError(code, message, response.status_code)

    async def list_trainers(self) -> list[dict[str, object]]:
        """List registered trainers via ``GET /trainers/``."""
        result: list[dict[str, object]] = await self._request("GET", "/trainers/")
        return result

    async def create_run(
        self,
        project_id: int,
        experiment_id: int,
        trainer_name: str,
        config: dict[str, object],
    ) -> dict[str, object]:
        """Create a training run via ``POST /runs/`` (``RunCreate`` shape)."""
        payload = {
            "project_id": project_id,
            "experiment_id": experiment_id,
            "trainer_name": trainer_name,
            "config": config,
        }
        result: dict[str, object] = await self._request("POST", "/runs/", json=payload)
        return result

    async def get_run(
        self,
        run_id: int,
        project_id: int | None = None,
        experiment_id: int | None = None,
    ) -> dict[str, object]:
        """Get a run via ``GET /runs/{id}`` (scoped only when both IDs given)."""
        params: dict[str, object] = {}
        if project_id is not None and experiment_id is not None:
            params = {"project_id": project_id, "experiment_id": experiment_id}
        result: dict[str, object] = await self._request(
            "GET", f"/runs/{run_id}", params=params or None
        )
        return result

    async def list_runs(
        self, project_id: int, experiment_id: int
    ) -> list[dict[str, object]]:
        """List runs in an experiment via ``GET /runs/``."""
        params: dict[str, object] = {
            "project_id": project_id,
            "experiment_id": experiment_id,
        }
        result: list[dict[str, object]] = await self._request(
            "GET", "/runs/", params=params
        )
        return result

    async def compare_runs(
        self, project_id: int, experiment_id: int, run_ids: list[int]
    ) -> dict[str, object]:
        """Compare runs via ``GET /runs/compare`` (repeated ``run_ids`` params)."""
        params: dict[str, object] = {
            "project_id": project_id,
            "experiment_id": experiment_id,
            "run_ids": run_ids,
        }
        result: dict[str, object] = await self._request(
            "GET", "/runs/compare", params=params
        )
        return result

    async def aclose(self) -> None:
        await self._client.aclose()
