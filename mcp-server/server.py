"""TrainGrid MCP server entrypoint (Streamable HTTP, stateless).

Serves MCP tools over ``POST /mcp`` per spec 2025-11-25. Stateless mode keeps
each request independent so the service can sit behind Docker Compose without
session affinity. Tools call the TrainGrid API over HTTP only (never the DB).
"""

from __future__ import annotations

import os
from typing import Any

from mcp.server.fastmcp import FastMCP

from traingrid_client import TrainGridClient

mcp = FastMCP("TrainGrid", stateless_http=True, json_response=True)


@mcp.tool(
    description="Health check: verifies the MCP server can reach the TrainGrid API."
)
async def ping() -> str:
    """Return API health or a short unhealthy reason (never raises)."""
    client = TrainGridClient()
    try:
        data = await client.health()
        return f"ok: api={data}"
    except Exception as exc:
        return f"unhealthy: {exc}"
    finally:
        await client.aclose()


@mcp.tool(description="List registered trainers with labels and config schemas.")
async def list_trainers() -> list[dict[str, Any]]:
    """Return trainers from ``GET /trainers/``."""
    client = TrainGridClient()
    try:
        trainers: list[dict[str, Any]] = await client.list_trainers()
        return trainers
    finally:
        await client.aclose()


@mcp.tool(description="Create a training run for a trainer with the given config.")
async def create_run(
    project_id: int,
    experiment_id: int,
    trainer_name: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    """Create a run via ``POST /runs/`` and return the run payload."""
    client = TrainGridClient()
    try:
        run: dict[str, Any] = await client.create_run(
            project_id, experiment_id, trainer_name, config
        )
        return run
    finally:
        await client.aclose()


@mcp.tool(description="Get a training run by ID, with status, config, and metrics.")
async def get_run(
    run_id: int,
    project_id: int | None = None,
    experiment_id: int | None = None,
) -> dict[str, Any]:
    """Return the run from ``GET /runs/{id}`` (scoped when both IDs given)."""
    client = TrainGridClient()
    try:
        run: dict[str, Any] = await client.get_run(run_id, project_id, experiment_id)
        return run
    finally:
        await client.aclose()


@mcp.tool(description="List training runs within an experiment.")
async def list_runs(project_id: int, experiment_id: int) -> list[dict[str, Any]]:
    """Return runs from ``GET /runs/`` for the project and experiment."""
    client = TrainGridClient()
    try:
        runs: list[dict[str, Any]] = await client.list_runs(project_id, experiment_id)
        return runs
    finally:
        await client.aclose()


@mcp.tool(description="Compare training runs side-by-side (config and metrics matrix).")
async def compare_runs(
    project_id: int, experiment_id: int, run_ids: list[int]
) -> dict[str, Any]:
    """Return the comparison from ``GET /runs/compare``."""
    client = TrainGridClient()
    try:
        comparison: dict[str, Any] = await client.compare_runs(
            project_id, experiment_id, run_ids
        )
        return comparison
    finally:
        await client.aclose()


def get_port() -> int:
    """Return the port to serve on (8002 avoids the worker-metrics 8001)."""
    try:
        return int(os.getenv("MCP_PORT", "8002"))
    except ValueError:
        return 8002


if __name__ == "__main__":
    mcp.settings.host = "0.0.0.0"
    mcp.settings.port = get_port()
    mcp.run(transport="streamable-http")
