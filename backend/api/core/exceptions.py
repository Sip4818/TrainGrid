from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.shared.errors import TrainGridError, NotFoundError


async def handle_traingrid_error(request: Request, exc: Exception) -> JSONResponse:
    """Catch any TrainGridError and return a 500 with error details."""
    return JSONResponse(
        status_code=500,
        content={"detail": {"code": "INTERNAL_ERROR", "message": str(exc)}},
    )


async def handle_not_found(request: Request, exc: Exception) -> JSONResponse:
    """Catch any NotFoundError and return a 404."""
    return JSONResponse(
        status_code=404,
        content={"detail": {"code": "NOT_FOUND", "message": str(exc)}},
    )


async def handle_generic_error(request: Request, exc: Exception) -> JSONResponse:
    """Catch any unhandled exception and return a 500."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            }
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""
    app.add_exception_handler(TrainGridError, handle_traingrid_error)
    app.add_exception_handler(NotFoundError, handle_not_found)
    app.add_exception_handler(Exception, handle_generic_error)
