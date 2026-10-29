import os
from sdk.traingrid.exceptions import TrainGridError, TrainGridApiError
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
            raise TrainGridError("Base url is required")

        self.http_ = httpx.Client(base_url=base_url, headers=headers, timeout=time_out)

    def request(self, method: str, path: str):
        "Send a http request"
        try:
            response = self.http_.request(method=method, url=path)
        except httpx.HTTPError as exc:
            raise TrainGridError(f"Request failed: {exc}") from exc
        if response.is_error:
            raise TrainGridApiError.from_response(response) from None
        return response
