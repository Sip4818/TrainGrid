FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy workspace metadata first so dependency layers cache
# until pyproject.toml or uv.lock change.
COPY pyproject.toml uv.lock ./
COPY mcp-server/pyproject.toml ./mcp-server/

RUN uv sync --frozen --no-dev --package traingrid-mcp-server

# uv installs into /app/.venv; put its console scripts on PATH.
ENV PATH="/app/.venv/bin:$PATH"

COPY mcp-server/ ./mcp-server/

EXPOSE 8002

# Default process: stateless Streamable HTTP server on :8002/mcp.
CMD ["python", "mcp-server/server.py"]
