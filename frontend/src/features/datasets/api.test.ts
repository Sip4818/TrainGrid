import { describe, it, expect, vi, beforeEach } from "vitest";
import { listDatasets, uploadDataset } from "./api";
import type { Dataset } from "./types";
import { ApiError } from "../../api/client";

const BASE_URL = "http://localhost:8000";

const sampleDataset: Dataset = {
  id: 3,
  name: "iris.csv",
  size_bytes: 4096,
  store_key: "datasets/3/dataset.csv",
  created_at: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("listDatasets", () => {
  it("returns uploaded datasets on success", async () => {
    const datasets = [sampleDataset];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(datasets), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listDatasets();
    expect(result).toEqual(datasets);
    expect(result).toHaveLength(1);
  });

  it("calls GET /datasets/", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await listDatasets();
    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/datasets/`,
      expect.any(Object),
    );
  });

  it("throws ApiError on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const promise = listDatasets();
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("uploadDataset", () => {
  const file = new File(["a,b\n1,2\n"], "data.csv", { type: "text/csv" });

  it("returns the created dataset on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleDataset), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await uploadDataset(file, "data.csv");
    expect(result).toEqual(sampleDataset);
    expect(result.store_key).toBe("datasets/3/dataset.csv");
  });

  it("sends multipart form data to POST /datasets/", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleDataset), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await uploadDataset(file, "data.csv");

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/datasets/`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const formData = init.body as FormData;
    expect(formData.get("file")).toBe(file);
    expect(formData.get("name")).toBe("data.csv");
    expect(init.headers).not.toEqual(
      expect.objectContaining({ "Content-Type": "application/json" }),
    );
  });

  it("omits the name field when not provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleDataset), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await uploadDataset(file);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;
    expect(formData.has("name")).toBe(false);
  });

  it("throws ApiError on validation error (422)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Invalid file type" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const promise = uploadDataset(file, "data.csv");
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 422,
      message: "Invalid file type",
    });
  });
});