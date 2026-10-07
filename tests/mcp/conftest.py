"""Pytest bootstrap for MCP service tests.

The MCP service ships no importable package (``packages = []``, mirroring
``backend``), so its modules live in ``mcp-server/``. Expose that directory
on ``sys.path`` the same way pytest already picks up the repo root for
``backend`` imports.
"""

import sys
from pathlib import Path

MCP_SERVER_DIR = Path(__file__).resolve().parents[2] / "mcp-server"

if str(MCP_SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(MCP_SERVER_DIR))
