import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "./client";

const BASE_URL = "http://localhost:8000";

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? "Not Found" : "Error",
    json: () => Promise.resolve(body),
  } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiClient.get", () => {
  it("returns parsed JSON on successful GET", async () => {
    const data = { id: 1, name: "test" };
    const fetchSpy = mockFetch(200, data);

    const result = await apiClient.get<typeof data>("/runs/1");

    expect(result).toEqual(data);
    expect(fetchSpy).toHaveBeenCalledWith(`${BASE_URL}/runs/1`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("throws ApiError on 404", async () => {
    mockFetch(404, { detail: { code: "NOT_FOUND", message: "Run not found" } });

    await expect(apiClient.get("/runs/999")).rejects.toThrow(ApiError);
    await expect(apiClient.get("/runs/999")).rejects.toMatchObject({
      status: 404,
      detail: { detail: { code: "NOT_FOUND", message: "Run not found" } },
    });
  });

  it("throws ApiError on 500", async () => {
    mockFetch(500, { detail: { code: "INTERNAL_ERROR", message: "Server error" } });

    await expect(apiClient.get("/runs/")).rejects.toThrow(ApiError);
    await expect(apiClient.get("/runs/")).rejects.toMatchObject({
      status: 500,
    });
  });

  it("throws ApiError when response body is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: () => Promise.reject(new Error("not json")),
    } as Response);

    await expect(apiClient.get("/runs/")).rejects.toThrow(ApiError);
    await expect(apiClient.get("/runs/")).rejects.toMatchObject({
      status: 503,
      message: "API request failed with status 503",
    });
  });
});

describe("apiClient.post", () => {
  it("sends JSON body and returns parsed response", async () => {
    const responseBody = { id: 1, status: "PENDING" };
    const fetchSpy = mockFetch(201, responseBody);

    const payload = { experiment_id: 1, config: { dataset_path: "data.csv", target_column: "target", feature_columns: ["x"] } };
    const result = await apiClient.post("/runs/", payload);

    expect(result).toEqual(responseBody);
    expect(fetchSpy).toHaveBeenCalledWith(`${BASE_URL}/runs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });

  it("throws ApiError on validation error (422)", async () => {
    mockFetch(422, { detail: [{ msg: "field required", loc: ["body", "experiment_id"] }] });

    await expect(apiClient.post("/runs/", {})).rejects.toThrow(ApiError);
    await expect(apiClient.post("/runs/", {})).rejects.toMatchObject({
      status: 422,
    });
  });

  it("sends request without body when none provided", async () => {
    const fetchSpy = mockFetch(200, {});
    await apiClient.post("/runs/");

    expect(fetchSpy).toHaveBeenCalledWith(`${BASE_URL}/runs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: undefined,
    });
  });
});

describe("204 No Content", () => {
  it("returns undefined on 204 for get", async () => {
    mockFetch(204, undefined);

    const result = await apiClient.get("/runs/1");

    expect(result).toBeUndefined();
  });

  it("returns undefined on 204 for post", async () => {
    mockFetch(204, undefined);

    const result = await apiClient.post("/runs/");

    expect(result).toBeUndefined();
  });
});

describe("ApiError", () => {
  it("extracts message from detail object", () => {
    const err = new ApiError(404, { code: "NOT_FOUND", message: "Run not found" });
    expect(err.message).toBe("Run not found");
    expect(err.status).toBe(404);
    expect(err.name).toBe("ApiError");
  });

  it("falls back to default message when detail has no message", () => {
    const err = new ApiError(500, "server error");
    expect(err.message).toBe("API request failed with status 500");
  });

  it("falls back to default message when detail is null", () => {
    const err = new ApiError(500, null);
    expect(err.message).toBe("API request failed with status 500");
  });
});
