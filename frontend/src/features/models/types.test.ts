import { describe, it, expect } from "vitest";
import {
  ModelStage,
  type RegisteredModelSummary,
  type RegisteredModel,
  type ModelRegisterRequest,
  type ModelStageUpdate,
} from "./types";

describe("ModelStage enum", () => {
  it("has correct string values matching backend", () => {
    expect(ModelStage.NONE).toBe("none");
    expect(ModelStage.STAGING).toBe("staging");
    expect(ModelStage.PRODUCTION).toBe("production");
    expect(ModelStage.ARCHIVED).toBe("archived");
  });

  it("has exactly 4 members", () => {
    expect(Object.keys(ModelStage)).toHaveLength(4);
  });
});

describe("RegisteredModelSummary interface", () => {
  it("accepts a valid summary object", () => {
    const summary: RegisteredModelSummary = {
      id: 1,
      name: "fraud-detector",
      version: "v1.0.0",
      stage: ModelStage.PRODUCTION,
      metrics: { accuracy: 0.95 },
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(summary.name).toBe("fraud-detector");
    expect(summary.stage).toBe(ModelStage.PRODUCTION);
  });

  it("accepts empty metrics", () => {
    const summary: RegisteredModelSummary = {
      id: 1,
      name: "model",
      version: "v1.0.0",
      stage: ModelStage.NONE,
      metrics: {},
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(summary.metrics).toEqual({});
  });
});

describe("RegisteredModel interface", () => {
  const sampleModel: RegisteredModel = {
    id: 1,
    name: "fraud-detector",
    version: "v1.0.0",
    run_id: 5,
    project_id: 1,
    experiment_id: 10,
    stage: ModelStage.PRODUCTION,
    description: "Production fraud model",
    artifact_path: "runs/5/model.joblib",
    artifact_checksum: "abc123",
    dataset_hash: "def456",
    config: { n_estimators: 100 },
    metrics: { accuracy: 0.95 },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };

  it("accepts a valid full model object", () => {
    expect(sampleModel.id).toBe(1);
    expect(sampleModel.name).toBe("fraud-detector");
    expect(sampleModel.stage).toBe(ModelStage.PRODUCTION);
  });

  it("accepts null description", () => {
    const model: RegisteredModel = { ...sampleModel, description: null };
    expect(model.description).toBeNull();
  });

  it("accepts null artifact_checksum", () => {
    const model: RegisteredModel = { ...sampleModel, artifact_checksum: null };
    expect(model.artifact_checksum).toBeNull();
  });

  it("accepts null dataset_hash", () => {
    const model: RegisteredModel = { ...sampleModel, dataset_hash: null };
    expect(model.dataset_hash).toBeNull();
  });

  it("contains all expected keys", () => {
    const keys = Object.keys(sampleModel).sort();
    expect(keys).toEqual(
      [
        "id",
        "name",
        "version",
        "run_id",
        "project_id",
        "experiment_id",
        "stage",
        "description",
        "artifact_path",
        "artifact_checksum",
        "dataset_hash",
        "config",
        "metrics",
        "created_at",
        "updated_at",
      ].sort(),
    );
  });
});

describe("ModelRegisterRequest interface", () => {
  it("accepts a valid register request", () => {
    const req: ModelRegisterRequest = {
      name: "fraud-detector",
      version: "v1.0.0",
      run_id: 5,
    };
    expect(req.name).toBe("fraud-detector");
  });

  it("accepts optional description", () => {
    const req: ModelRegisterRequest = {
      name: "model",
      version: "v1.0.0",
      run_id: 1,
      description: "My model",
    };
    expect(req.description).toBe("My model");
  });

  it("allows description to be omitted", () => {
    const req: ModelRegisterRequest = {
      name: "model",
      version: "v1.0.0",
      run_id: 1,
    };
    expect(req.description).toBeUndefined();
  });
});

describe("ModelStageUpdate interface", () => {
  it("accepts a valid stage update", () => {
    const update: ModelStageUpdate = { stage: ModelStage.STAGING };
    expect(update.stage).toBe(ModelStage.STAGING);
  });

  it("accepts all stage values", () => {
    const stages: ModelStage[] = [
      ModelStage.NONE,
      ModelStage.STAGING,
      ModelStage.PRODUCTION,
      ModelStage.ARCHIVED,
    ];
    for (const stage of stages) {
      const update: ModelStageUpdate = { stage };
      expect(update.stage).toBe(stage);
    }
  });
});
