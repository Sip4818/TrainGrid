from unittest.mock import Mock

from sdk.traingrid.client import TrainGridClient


def create_client():

    return TrainGridClient(
        base_url="localhost:3000",
        api_key="xyz1234",
        time_out=20.0,
    )


def client():
    c = create_client()
    yield c
    c.close()


def test_base():
    assert str(create_client().http_.base_url) == "localhost:3000/"


def test_time_out():
    assert float(create_client().http_.timeout.read) == 20.0


def test_request():
    client = create_client()
    client.http_.request = Mock(
        return_value=Mock(status_code=200, json=Mock(return_value={"id": 1}))
    )
    response = client.request(method="GET", path="/runs/1")

    client.http_.request.assert_called_once_with(method="GET", url="/runs/1")

    assert response.status_code == 200
    assert response.json() == {"id": 1}
