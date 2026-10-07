"""TrainGrid MCP server entrypoint (Streamable HTTP, stateless).

Serves MCP tools over ``POST /mcp`` per spec 2025-11-25. Stateless mode keeps
each request independent so the service can sit behind Docker Compose without
session affinity. Domain tools (list/create/compare runs) land in a later
slice; this scaffold exposes ``ping`` so the Inspector
``initialize`` -> ``tools/list`` -> ``tools/call`` flow can be verified.
"""

from __future__ import annotations

import os

from mcp.server.fastmcp import FastMCP

from traingrid_client import TrainGridClient

mcp = FastMCP("TrainGrid", stateless_http=True, json_response=True)


@mcp.tool(description="Health check: verifies the MCP server can reach the TrainGrid API.")
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


def get_port() -> int:
    """Return the port to serve on (8002 avoids the worker-metrics 8001)."""
    try:
        return int(os.getenv("MCP_PORT", "8002"))
    except ValueError:
        return 8002


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=get_port())
