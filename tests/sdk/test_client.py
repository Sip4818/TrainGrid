from sdk.traingrid.client import TrainGridClient


def create_client():

    return TrainGridClient(
        base_url="localhost:3000",
        api_key="xyz1234",
        time_out=20.0,
    ).http_


def client():
    c = create_client()
    yield c
    c.close()


def test_base():
    assert str(create_client().base_url) == "localhost:3000/"


def test_time_out():
    assert float(create_client().timeout.read) == 20.0
