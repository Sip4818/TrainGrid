import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listModels,
  getModel,
  listModelVersions,
  registerModel,
  promoteModel,
} from "./api";
import type { RegisteredModel } from "./types";
import { ModelStage } from "./types";

const BASE_URL = "http://localhost:8000";

const sampleModel: RegisteredModel = {
  id: 1,
  name: "fraud-detector",
  version: "v1.0.0",
  run_id: 5,
  project_id: 1,
  experiment_id: 10,
  stage: ModelStage.PRODUCTION,
  description: "Test model",
  artifact_path: "runs/5/model.joblib",
  artifact_checksum: "abc123",
  dataset_hash: "def456",
  config: { n_estimators: 100 },
  metrics: { accuracy: 0.95 },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("models API functions", () => {
  describe("listModels", () => {
    it("fetches models list from correct endpoint", async () => {
      const summary = {
        id: 1,
        name: "fraud-detector",
        version: "v1.0.0",
        stage: ModelStage.PRODUCTION,
        metrics: { accuracy: 0.95 },
        created_at: "2026-01-01T00:00:00Z",
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([summary]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await listModels();
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("fraud-detector");
    });

    it("constructs URL without project_id param", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await listModels();
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/models/`,
        expect.any(Object),
      );
    });
  });

  describe("getModel", () => {
    it("fetches a single model by name", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(sampleModel), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await getModel("fraud-detector");
      expect(result.name).toBe("fraud-detector");
      expect(result.version).toBe("v1.0.0");
    });

    it("constructs URL with name only", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(sampleModel), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await getModel("credit-scorer");
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/models/credit-scorer`,
        expect.any(Object),
      );
    });
  });

  describe("listModelVersions", () => {
    it("fetches all versions of a model", async () => {
      const versions = [
        { ...sampleModel, version: "v2.0.0" },
        { ...sampleModel, version: "v1.0.0" },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(versions), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await listModelVersions("fraud-detector");
      expect(result).toHaveLength(2);
      expect(result[0]!.version).toBe("v2.0.0");
    });

    it("constructs URL with name only", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await listModelVersions("fraud-detector");
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/models/fraud-detector/versions`,
        expect.any(Object),
      );
    });
  });

  describe("registerModel", () => {
    it("sends POST to /models/ with payload", async () => {
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

    it("returns the registered model", async () => {
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
      });
      expect(result.id).toBe(1);
      expect(result.stage).toBe(ModelStage.PRODUCTION);
    });
  });

  describe("promoteModel", () => {
    it("sends POST to promote endpoint", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(sampleModel), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await promoteModel("fraud-detector", "v1.0.0", {
        stage: ModelStage.STAGING,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/models/fraud-detector/versions/v1.0.0/promote`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ stage: "staging" }),
        }),
      );
    });

    it("returns the updated model", async () => {
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
  });
});
