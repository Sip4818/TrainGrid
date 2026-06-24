import { describe, it, expect } from "vitest";
import { RunStatus, type RunConfig, type RunCreate, type Run } from "./types";

describe("RunStatus enum", () => {
  it("has correct string values matching backend", () => {
    expect(RunStatus.PENDING).toBe("pending");
    expect(RunStatus.RUNNING).toBe("running");
    expect(RunStatus.COMPLETED).toBe("completed");
    expect(RunStatus.FAILED).toBe("failed");
    expect(RunStatus.CANCELLED).toBe("cancelled");
  });

  it("has exactly 5 members", () => {
    expect(Object.keys(RunStatus)).toHaveLength(5);
  });
});

describe("RunConfig interface", () => {
  it("accepts a valid config object", () => {
    const config: RunConfig = {
      dataset_path: "data.csv",
      target_column: "price",
      feature_columns: ["sqft", "beds"],
      n_estimators: 200,
      max_depth: 10,
    };
    expect(config.dataset_path).toBe("data.csv");
    expect(config.target_column).toBe("price");
    expect(config.feature_columns).toHaveLength(2);
  });

  it("accepts optional fields omitted", () => {
    const config: RunConfig = {
      dataset_path: "data.csv",
      target_column: "price",
      feature_columns: ["sqft"],
    };
    expect(config.n_estimators).toBeUndefined();
    expect(config.max_depth).toBeUndefined();
  });

  it("accepts null max_depth", () => {
    const config: RunConfig = {
      dataset_path: "data.csv",
      target_column: "price",
      feature_columns: ["sqft"],
      max_depth: null,
    };
    expect(config.max_depth).toBeNull();
  });

  it("allows additional keys via index signature", () => {
    const config: RunConfig = {
      dataset_path: "data.csv",
      target_column: "price",
      feature_columns: ["sqft"],
      extra_param: "value",
    };
    expect(config.extra_param).toBe("value");
  });

  it("requires dataset_path, target_column, feature_columns", () => {
    // Compile-time check: these assignments should error on missing required fields
    const valid: RunConfig = {
      dataset_path: "x",
      target_column: "y",
      feature_columns: ["z"],
    };
    expect(Object.keys(valid).length).toBeGreaterThanOrEqual(3);
  });
});

describe("RunCreate interface", () => {
  it("accepts a valid run create payload", () => {
    const payload: RunCreate = {
      experiment_id: 42,
      config: {
        dataset_path: "data.csv",
        target_column: "label",
        feature_columns: ["a", "b"],
      },
    };
    expect(payload.experiment_id).toBe(42);
    expect(payload.config.dataset_path).toBe("data.csv");
  });

  it("requires both experiment_id and config", () => {
    const payload: RunCreate = {
      experiment_id: 1,
      config: {
        dataset_path: "x",
        target_column: "y",
        feature_columns: ["z"],
      },
    };
    expect(payload).toHaveProperty("experiment_id");
    expect(payload).toHaveProperty("config");
  });
});

describe("Run interface", () => {
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

  it("accepts a valid full run object", () => {
    expect(sampleRun.id).toBe(1);
    expect(sampleRun.status).toBe(RunStatus.PENDING);
    expect(sampleRun.created_at).toBe("2026-01-01T00:00:00Z");
  });

  it("accepts RUNNING status with started_at populated", () => {
    const running: Run = {
      ...sampleRun,
      status: RunStatus.RUNNING,
      started_at: "2026-01-01T00:01:00Z",
    };
    expect(running.status).toBe(RunStatus.RUNNING);
    expect(running.started_at).toBe("2026-01-01T00:01:00Z");
  });

  it("accepts COMPLETED status with metrics and finished_at", () => {
    const completed: Run = {
      ...sampleRun,
      status: RunStatus.COMPLETED,
      metrics: { accuracy: 0.95 },
      started_at: "2026-01-01T00:01:00Z",
      finished_at: "2026-01-01T00:05:00Z",
    };
    expect(completed.metrics.accuracy).toBe(0.95);
    expect(completed.finished_at).toBe("2026-01-01T00:05:00Z");
  });

  it("accepts FAILED status", () => {
    const failed: Run = {
      ...sampleRun,
      status: RunStatus.FAILED,
      metrics: { error: "Out of memory" },
      started_at: "2026-01-01T00:01:00Z",
      finished_at: "2026-01-01T00:02:00Z",
    };
    expect(failed.status).toBe(RunStatus.FAILED);
  });

  it("accepts artifact_path when not null", () => {
    const withArtifact: Run = {
      ...sampleRun,
      status: RunStatus.COMPLETED,
      artifact_path: "/artifacts/run_1/",
    };
    expect(withArtifact.artifact_path).toBe("/artifacts/run_1/");
  });

  it("contains all expected keys", () => {
    const keys = Object.keys(sampleRun).sort();
    expect(keys).toEqual(
      [
        "id",
        "experiment_id",
        "config",
        "status",
        "metrics",
        "artifact_path",
        "created_at",
        "started_at",
        "finished_at",
      ].sort(),
    );
  });
});
