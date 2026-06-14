Write-Host "Running ruff format (auto-formatting)..." -ForegroundColor Cyan
.\.venv\Scripts\ruff format .
if ($LASTEXITCODE -ne 0) { Write-Host "Ruff format failed!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "Running ruff check (auto-fixing lint errors)..." -ForegroundColor Cyan
.\.venv\Scripts\ruff check . --fix
if ($LASTEXITCODE -ne 0) { Write-Host "Ruff check failed!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "Running mypy (type checking)..." -ForegroundColor Cyan
.\.venv\Scripts\mypy .
if ($LASTEXITCODE -ne 0) { Write-Host "Mypy failed!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "Running pytest (testing)..." -ForegroundColor Cyan
.\.venv\Scripts\pytest
if ($LASTEXITCODE -ne 0) { Write-Host "Pytest failed!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "All checks passed and auto-fixes applied successfully!" -ForegroundColor Green
