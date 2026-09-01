from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.shared.errors import (
    DatasetUploadError,
    ModelNotFoundError,
    ModelVersionExistsError,
    ModelVersionNotFoundError,
    NotFoundError,
    RunNotInExperimentError,
    RunNotInScopeError,
    TrainerNotFoundError,
    TrainGridError,
)


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


async def handle_trainer_not_found(request: Request, exc: Exception) -> JSONResponse:
    """Catch TrainerNotFoundError and return a 422."""
    return JSONResponse(
        status_code=422,
        content={"detail": {"code": "TRAINER_NOT_FOUND", "message": str(exc)}},
    )


async def handle_run_not_in_experiment(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch RunNotInExperimentError and return a 422."""
    return JSONResponse(
        status_code=422,
        content={"detail": {"code": "RUN_NOT_IN_EXPERIMENT", "message": str(exc)}},
    )


async def handle_dataset_upload_error(request: Request, exc: Exception) -> JSONResponse:
    """Catch DatasetUploadError and return a 422."""
    return JSONResponse(
        status_code=422,
        content={"detail": {"code": "DATASET_UPLOAD_ERROR", "message": str(exc)}},
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


async def handle_model_not_found(request: Request, exc: Exception) -> JSONResponse:
    """Catch ModelNotFoundError and return a 404."""
    return JSONResponse(
        status_code=404,
        content={"detail": {"code": "MODEL_NOT_FOUND", "message": str(exc)}},
    )


async def handle_model_version_not_found(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch ModelVersionNotFoundError and return a 404."""
    return JSONResponse(
        status_code=404,
        content={"detail": {"code": "MODEL_VERSION_NOT_FOUND", "message": str(exc)}},
    )


async def handle_model_version_exists(request: Request, exc: Exception) -> JSONResponse:
    """Catch ModelVersionExistsError and return a 409."""
    return JSONResponse(
        status_code=409,
        content={"detail": {"code": "MODEL_VERSION_EXISTS", "message": str(exc)}},
    )


async def handle_run_not_in_scope(request: Request, exc: Exception) -> JSONResponse:
    """Catch RunNotInScopeError and return a 422."""
    return JSONResponse(
        status_code=422,
        content={"detail": {"code": "RUN_NOT_IN_SCOPE", "message": str(exc)}},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""
    app.add_exception_handler(TrainGridError, handle_traingrid_error)
    app.add_exception_handler(NotFoundError, handle_not_found)
    app.add_exception_handler(TrainerNotFoundError, handle_trainer_not_found)
    app.add_exception_handler(RunNotInExperimentError, handle_run_not_in_experiment)
    app.add_exception_handler(DatasetUploadError, handle_dataset_upload_error)
    app.add_exception_handler(ModelNotFoundError, handle_model_not_found)
    app.add_exception_handler(ModelVersionNotFoundError, handle_model_version_not_found)
    app.add_exception_handler(ModelVersionExistsError, handle_model_version_exists)
    app.add_exception_handler(RunNotInScopeError, handle_run_not_in_scope)
    app.add_exception_handler(Exception, handle_generic_error)
