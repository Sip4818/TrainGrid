import os

import httpx


class TrainGridClient:
    """Sync HTTP Client for traingrid"""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        time_out: float = 30.0,
    ):
        # TODO : Add transport as a argumnet
        headers = {}
        key = api_key or os.getenv("TrainGrid_API_KEY")
        headers["Authorization"] = f"Bearer {key}"

        if base_url is None:
            raise ValueError("Base url is required")

        self.http_ = httpx.Client(base_url=base_url, headers=headers, timeout=time_out)

    def request(self, method: str, path: str):
        "Send a http request"
        try:
            respone = self.http_.request(method=method, url=path)
            return respone
        except Exception:
            # TODO : give proper http exception
            raise Exception
