import httpx

from sdk.traingrid.exceptions import (
    TrainGridApiError,
    TrainGridError,
    TrainGridTimeoutError,
)


def test_hierarchy():
    assert issubclass(TrainGridApiError, TrainGridError)
    assert issubclass(TrainGridTimeoutError, TrainGridError)


def test_from_response_parses_detail():
    response = httpx.Response(
        status_code=422,
        json={"detail": {"code": "Trainer_NOT_FOUND", "message": "Nope"}},
    )
    err = TrainGridApiError.from_response(response)
    assert err.code == "Trainer_NOT_FOUND"
    assert err.message == "Nope"
    assert err.status_code == 422
