#!/usr/bin/env bash
set -euo pipefail

VENV_BIN=".venv/bin"

echo "Running ruff format (auto-formatting)..."
$VENV_BIN/ruff format .
echo "Ruff format passed!"

echo "Running ruff check (auto-fixing lint errors)..."
$VENV_BIN/ruff check . --fix
echo "Ruff check passed!"

echo "Running mypy (type checking)..."
$VENV_BIN/mypy .
echo "Mypy passed!"

echo "Running pytest (testing)..."
$VENV_BIN/pytest
echo "Pytest passed!"

echo "All checks passed and auto-fixes applied successfully!"
