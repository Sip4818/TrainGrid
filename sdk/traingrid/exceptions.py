import httpx


class TrainGridError(Exception):
    """Base for all sdk Errors"""


class TrainGridApiError(TrainGridError):
    def __init__(self, code: int | str, message: str, status_code: int) -> None:
        super().__init__(f"{code} (HTTP {status_code}): {message}")
        self.code = code
        self.message = message
        self.status_code = status_code

    @classmethod
    def from_response(cls, response: httpx.Response) -> "TrainGridApiError":

        try:
            detail = response.json().get("detail", {})
        except Exception:
            detail = {}

        if isinstance(detail, dict):
            code = detail.get("code", "API_ERROR")
            message = detail.get("message", response.text)
        else:
            code = "API_ERROR"
            message = response.text

        return cls(code, message, response.status_code)


class TrainGridTimeoutError(TrainGridError):
    def __init__(self, run_id: int, timeout: float) -> None:
        super().__init__(f"Run {run_id} did not complete within {timeout}")
        self.run_id = run_id
        self.timeout = timeout
