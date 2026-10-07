"""Streamable HTTP contract tests for the MCP server.

Spins up the real MCP server in a background thread against a stub TrainGrid
API (stdlib HTTP server, no network beyond localhost) and drives the
Inspector flow: ``initialize`` → ``tools/list`` → ``tools/call``. Also locks
in session handling (stateless: no ``Mcp-Session-Id`` affinity) and Origin
validation (localhost allowed, cross-origin rejected with 403).
"""

import json
import os
import socket
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import httpx
import pytest
import server as mcp_server

PROTOCOL_VERSION = "2025-11-25"
EXPECTED_TOOLS = {
    "ping",
    "list_trainers",
    "create_run",
    "get_run",
    "list_runs",
    "compare_runs",
}

STUB_RUN = {
    "experiment_id": 1,
    "project_id": 1,
    "config": {"trainer_name": "random_forest", "n_estimators": 10},
    "id": 7,
    "status": "pending",
    "metrics": {},
    "artifact_path": None,
}


class _StubAPIHandler(BaseHTTPRequestHandler):
    """Minimal canned TrainGrid API, including the #76 error cases."""

    def log_message(self, *args):
        pass

    def _send(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode())

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        if parsed.path == "/health":
            self._send(200, {"status": "ok"})
        elif parsed.path == "/trainers/":
            self._send(
                200,
                [
                    {
                        "name": "random_forest",
                        "label": "Random Forest",
                        "config_schema": {},
                    }
                ],
            )
        elif parsed.path == "/runs/compare":
            run_ids = [int(v) for v in query.get("run_ids", [])]
            self._send(
                200,
                {
                    "runs": [{**STUB_RUN, "id": run_id} for run_id in run_ids],
                    "metrics": ["accuracy"],
                },
            )
        elif parsed.path == "/runs/":
            self._send(200, [STUB_RUN])
        elif parsed.path.startswith("/runs/"):
            run_id = parsed.path.split("/")[2]
            if run_id == "999":
                self._send(
                    404,
                    {
                        "detail": {
                            "code": "NOT_FOUND",
                            "message": f"Training run with id '{run_id}' not found",
                        }
                    },
                )
            elif query.get("experiment_id") == ["99"]:
                self._send(
                    422,
                    {
                        "detail": {
                            "code": "RUN_NOT_IN_EXPERIMENT",
                            "message": f"Run with id '{run_id}' not in experiment",
                        }
                    },
                )
            else:
                self._send(200, {**STUB_RUN, "id": int(run_id)})
        else:
            self._send(404, {"detail": {"code": "NOT_FOUND", "message": "nope"}})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/runs/":
            self._send(404, {"detail": {"code": "NOT_FOUND", "message": "nope"}})
            return
        body = self._read_json()
        if body.get("trainer_name") == "nope":
            self._send(
                422,
                {
                    "detail": {
                        "code": "TRAINER_NOT_FOUND",
                        "message": "Trainer 'nope' is not registered",
                    }
                },
            )
            return
        self._send(200, STUB_RUN)


def _free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@pytest.fixture(scope="module")
def mcp_base_url():
    """Run the stub API and the real MCP server on ephemeral localhost ports."""
    api = ThreadingHTTPServer(("127.0.0.1", 0), _StubAPIHandler)
    api_thread = threading.Thread(target=api.serve_forever, daemon=True)
    api_thread.start()

    previous = os.environ.get("TRAINGRID_API_URL")
    os.environ["TRAINGRID_API_URL"] = f"http://127.0.0.1:{api.server_port}"
    port = _free_port()
    mcp_server.mcp.settings.host = "127.0.0.1"
    mcp_server.mcp.settings.port = port
    server_thread = threading.Thread(
        target=mcp_server.mcp.run,
        kwargs={"transport": "streamable-http"},
        daemon=True,
    )
    server_thread.start()
    try:
        base_url = f"http://127.0.0.1:{port}"
        _wait_ready(base_url)
        yield base_url
    finally:
        if previous is None:
            del os.environ["TRAINGRID_API_URL"]
        else:
            os.environ["TRAINGRID_API_URL"] = previous
        api.shutdown()


def _wait_ready(base_url):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 0,
        "method": "initialize",
        "params": {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {"name": "readiness", "version": "0"},
        },
    }
    with httpx.Client(base_url=base_url, timeout=5.0) as client:
        for _ in range(60):
            try:
                response = client.post("/mcp", json=payload, headers=headers)
                if response.status_code == 200:
                    return
            except httpx.ConnectError:
                pass
            import time

            time.sleep(0.5)
    raise AssertionError("MCP server did not become ready")


@pytest.fixture()
def mcp_client(mcp_base_url):
    with httpx.Client(
        base_url=mcp_base_url,
        timeout=30.0,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
    ) as client:
        yield client


def _rpc(client, rpc_id, method, params, extra_headers=None):
    response = client.post(
        "/mcp",
        json={"jsonrpc": "2.0", "id": rpc_id, "method": method, "params": params},
        headers=extra_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == rpc_id
    return body["result"]


def _initialize_params():
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {},
        "clientInfo": {"name": "contract-test", "version": "0"},
    }


def _call(client, rpc_id, name, arguments):
    return _rpc(client, rpc_id, "tools/call", {"name": name, "arguments": arguments})


def test_initialize_negotiates_version(mcp_client):
    result = _rpc(mcp_client, 1, "initialize", _initialize_params())
    assert result["protocolVersion"] == PROTOCOL_VERSION
    assert result["serverInfo"]["name"] == "TrainGrid"


def test_initialize_is_stateless(mcp_client):
    """No session affinity: repeat initialize with a bogus session id works."""
    result = _rpc(
        mcp_client,
        2,
        "initialize",
        _initialize_params(),
        extra_headers={"Mcp-Session-Id": "bogus"},
    )
    assert result["protocolVersion"] == PROTOCOL_VERSION


def test_localhost_origin_allowed(mcp_client):
    result = _rpc(
        mcp_client,
        3,
        "initialize",
        _initialize_params(),
        extra_headers={"Origin": "http://localhost:9"},
    )
    assert result["protocolVersion"] == PROTOCOL_VERSION


def test_cross_origin_rejected(mcp_client):
    response = mcp_client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 4,
            "method": "initialize",
            "params": _initialize_params(),
        },
        headers={"Origin": "https://evil.example.com"},
    )
    assert response.status_code == 403


def test_tools_list_exposes_run_tools(mcp_client):
    _rpc(mcp_client, 5, "initialize", _initialize_params())
    result = _rpc(mcp_client, 6, "tools/list", {})
    assert {t["name"] for t in result["tools"]} == EXPECTED_TOOLS


def test_ping_reports_stub_api_health(mcp_client):
    result = _call(mcp_client, 7, "ping", {})
    assert result["isError"] is False
    assert "ok:" in result["structuredContent"]["result"]


def test_list_trainers_round_trip(mcp_client):
    result = _call(mcp_client, 8, "list_trainers", {})
    assert result["isError"] is False
    names = [t["name"] for t in result["structuredContent"]["result"]]
    assert names == ["random_forest"]


def test_create_get_list_compare_round_trip(mcp_client):
    created = _call(
        mcp_client,
        9,
        "create_run",
        {
            "project_id": 1,
            "experiment_id": 1,
            "trainer_name": "random_forest",
            "config": {"n_estimators": 10},
        },
    )
    assert created["isError"] is False
    assert created["structuredContent"]["id"] == 7

    fetched = _call(mcp_client, 10, "get_run", {"run_id": 7})
    assert fetched["isError"] is False
    assert fetched["structuredContent"]["status"] == "pending"

    listed = _call(mcp_client, 11, "list_runs", {"project_id": 1, "experiment_id": 1})
    assert listed["isError"] is False
    assert [r["id"] for r in listed["structuredContent"]["result"]] == [7]

    compared = _call(
        mcp_client,
        12,
        "compare_runs",
        {"project_id": 1, "experiment_id": 1, "run_ids": [7]},
    )
    assert compared["isError"] is False
    assert compared["structuredContent"]["metrics"] == ["accuracy"]


def test_unknown_trainer_error_mapping(mcp_client):
    result = _call(
        mcp_client,
        13,
        "create_run",
        {
            "project_id": 1,
            "experiment_id": 1,
            "trainer_name": "nope",
            "config": {},
        },
    )
    assert result["isError"] is True
    assert "TRAINER_NOT_FOUND" in result["content"][0]["text"]


def test_unknown_run_error_mapping(mcp_client):
    result = _call(mcp_client, 14, "get_run", {"run_id": 999})
    assert result["isError"] is True
    assert "NOT_FOUND" in result["content"][0]["text"]


def test_cross_experiment_run_error_mapping(mcp_client):
    result = _call(
        mcp_client,
        15,
        "get_run",
        {"run_id": 7, "project_id": 1, "experiment_id": 99},
    )
    assert result["isError"] is True
    assert "RUN_NOT_IN_EXPERIMENT" in result["content"][0]["text"]
