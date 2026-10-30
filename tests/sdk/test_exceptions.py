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


def test_from_response_detail_missing():
    response = httpx.Response(
        status_code=422,
        json={"foo": {}},
    )
    err = TrainGridApiError.from_response(response)
    assert err.status_code == 422
    assert err.message == response.text
    assert err.code == "API_ERROR"


def test_from_response_json_is_list():
    response = httpx.Response(status_code=422, json=["API_ERROR"])
    err = TrainGridApiError.from_response(response)
    assert err.status_code == 422
    assert err.message == response.text
    assert err.code == "API_ERROR"


def test_from_response_detail_is_list():
    response = httpx.Response(
        status_code=422,
        json={"detail": []},
    )
    err = TrainGridApiError.from_response(response)
    assert err.code == "API_ERROR"
    assert err.message == response.text
    assert err.status_code == 422
