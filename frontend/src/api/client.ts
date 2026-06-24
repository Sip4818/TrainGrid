/**
 * TrainGrid API client.
 *
 * Provides typed fetch wrappers (get, post) that:
 * - Use the base URL from VITE_API_BASE_URL (default: http://localhost:8000)
 * - Serialize/deserialize JSON automatically
 * - Throw ApiError on non-2xx responses
 * - Forward typed response bodies on success
 */

/** Base URL for all API requests. Override via VITE_API_BASE_URL env var. */
const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/**
 * Error thrown when the API returns a non-2xx status code.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly detail: unknown;

  constructor(status: number, detail: unknown) {
    const message =
      typeof detail === "object" && detail !== null && "message" in detail
        ? String((detail as Record<string, unknown>).message)
        : `API request failed with status ${status}`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;

    // Ensure message is an own enumerable property so assertion matchers
    // (toMatchObject, toEqual) can see it in all environments.
    Object.defineProperty(this, "message", {
      value: message,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
}

/** Internal fetch wrapper shared by get/post. */
async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Network failure (offline, DNS, timeout, etc.)
    const message =
      error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(0, { message });
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = response.statusText;
    }
    throw new ApiError(response.status, detail);
  }

  // Handle 204 No Content (e.g., DELETE responses)
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body);
  },
};

