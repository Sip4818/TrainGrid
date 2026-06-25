import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRuns, getRun, createRun } from "./api";
import type { Run, RunCreate } from "./types";
import { RunStatus } from "./types";
import { ApiError } from "../../api/client";

const BASE_URL = "http://localhost:8000";

const sampleRun: Run = {
  id: 1,
  experiment_id: 42,
  config: {
    dataset_path: "data.csv",
    target_column: "label",
    feature_columns: ["a", "b"],
  },
  status: RunStatus.PENDING,
  metrics: {},
  artifact_path: null,
  created_at: "2026-01-01T00:00:00Z",
  started_at: null,
  finished_at: null,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getRuns", () => {
  it("returns a list of runs on success", async () => {
    const runs: Run[] = [
      sampleRun,
      { ...sampleRun, id: 2, status: RunStatus.COMPLETED },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(runs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getRuns();
    expect(result).toEqual(runs);
    expect(result).toHaveLength(2);
  });

  it("calls GET /runs/", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getRuns();
    expect(fetchSpy).toHaveBeenCalledWith(`${BASE_URL}/runs/`, expect.any(Object));
  });

  it("throws ApiError on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const promise = getRuns();
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 500 });
  });

  it("throws ApiError on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const promise = getRuns();
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 0 });
  });
});

describe("getRun", () => {
  it("returns a single run by id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getRun(1);
    expect(result).toEqual(sampleRun);
    expect(result.id).toBe(1);
  });

  it("calls GET /runs/1", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getRun(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/runs/1`,
      expect.any(Object),
    );
  });

  it("throws ApiError on 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const promise = getRun(999);
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 404,
      message: "Run not found",
    });
  });

  it("throws ApiError on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Offline"));

    const promise = getRun(1);
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 0 });
  });
});

describe("createRun", () => {
  const newRunPayload: RunCreate = {
    experiment_id: 42,
    config: {
      dataset_path: "data.csv",
      target_column: "label",
      feature_columns: ["a", "b"],
    },
  };

  it("returns the created run on success", async () => {
    const createdRun: Run = { ...sampleRun, id: 3 };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createdRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await createRun(newRunPayload);
    expect(result).toEqual(createdRun);
    expect(result.id).toBe(3);
  });

  it("sends POST with JSON body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await createRun(newRunPayload);

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/runs/`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(newRunPayload),
      }),
    );
  });

  it("throws ApiError on validation error (422)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          detail: [{ loc: ["body", "config"], msg: "field required", type: "value_error" }],
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const promise = createRun(newRunPayload);
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 422,
      message: "API request failed with status 422",
    });
  });

  it("throws ApiError on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    const promise = createRun(newRunPayload);
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 0,
    });
  });
});
