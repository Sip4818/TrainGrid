import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listModels,
  getModel,
  listModelVersions,
  registerModel,
  promoteModel,
} from "./api";
import type { RegisteredModelSummary, RegisteredModel } from "./types";
import { ModelStage } from "./types";
import { ApiError } from "../../api/client";

const BASE_URL = "http://localhost:8000";

const sampleSummary: RegisteredModelSummary = {
  id: 1,
  name: "fraud-detector",
  version: "v1.0.0",
  stage: ModelStage.PRODUCTION,
  metrics: { accuracy: 0.95 },
  created_at: "2026-01-01T00:00:00Z",
};

const sampleModel: RegisteredModel = {
  ...sampleSummary,
  run_id: 5,
  project_id: 1,
  experiment_id: 10,
  description: "Production fraud model",
  artifact_path: "runs/5/model.joblib",
  artifact_checksum: "abc123",
  dataset_hash: "def456",
  config: { n_estimators: 100 },
  updated_at: "2026-01-02T00:00:00Z",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("listModels", () => {
  it("returns a list of model summaries on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([sampleSummary]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listModels(1);
    expect(result).toEqual([sampleSummary]);
    expect(result).toHaveLength(1);
  });

  it("calls GET /models/?project_id={projectId}", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await listModels(42);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/models/?project_id=42`,
      expect.any(Object),
    );
  });

  it("throws ApiError on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const promise = listModels(1);
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("getModel", () => {
  it("returns a single model by name", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleModel), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getModel("fraud-detector", 1);
    expect(result).toEqual(sampleModel);
    expect(result.name).toBe("fraud-detector");
  });

  it("calls GET /models/{name}?project_id={projectId}", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleModel), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getModel("fraud-detector", 1);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/models/fraud-detector?project_id=1`,
      expect.any(Object),
    );
  });

  it("throws ApiError on 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Model not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const promise = getModel("unknown", 1);
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404 });
  });
});

describe("listModelVersions", () => {
  it("returns all versions of a model", async () => {
    const versions = [
      sampleModel,
      { ...sampleModel, id: 2, version: "v1.0.0", stage: ModelStage.ARCHIVED },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(versions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listModelVersions("fraud-detector", 1);
    expect(result).toHaveLength(2);
  });

  it("calls GET /models/{name}/versions?project_id={projectId}", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await listModelVersions("fraud-detector", 1);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/models/fraud-detector/versions?project_id=1`,
      expect.any(Object),
    );
  });
});

describe("registerModel", () => {
  it("returns the registered model on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleModel), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await registerModel({
      name: "fraud-detector",
      version: "v1.0.0",
      run_id: 5,
      project_id: 1,
      experiment_id: 10,
    });
    expect(result).toEqual(sampleModel);
  });

  it("sends POST with JSON body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleModel), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const payload = {
      name: "fraud-detector",
      version: "v1.0.0",
      run_id: 5,
      project_id: 1,
      experiment_id: 10,
    };
    await registerModel(payload);

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/models/`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("throws ApiError on duplicate version (409)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ detail: { code: "MODEL_VERSION_EXISTS", message: "Already exists" } }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const promise = registerModel({
      name: "fraud-detector",
      version: "v1.0.0",
      run_id: 5,
      project_id: 1,
      experiment_id: 10,
    });
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 409 });
  });
});

describe("promoteModel", () => {
  it("returns the updated model on success", async () => {
    const promoted = { ...sampleModel, stage: ModelStage.STAGING };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(promoted), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await promoteModel("fraud-detector", "v1.0.0", {
      stage: ModelStage.STAGING,
    });
    expect(result.stage).toBe(ModelStage.STAGING);
  });

  it("sends POST to promote endpoint with stage body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleModel), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await promoteModel("fraud-detector", "v1.0.0", {
      stage: ModelStage.PRODUCTION,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/models/fraud-detector/versions/v1.0.0/promote`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ stage: "production" }),
      }),
    );
  });
});
