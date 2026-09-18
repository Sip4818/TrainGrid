import { describe, it, expect } from "vitest";
import {
  SweepStatus,
  SearchStrategy,
  SweepGoal,
  type Sweep,
  type SweepCreate,
} from "./types";

describe("SweepStatus enum", () => {
  it("has correct string values matching backend", () => {
    expect(SweepStatus.PENDING).toBe("pending");
    expect(SweepStatus.RUNNING).toBe("running");
    expect(SweepStatus.COMPLETED).toBe("completed");
    expect(SweepStatus.FAILED).toBe("failed");
  });

  it("has exactly 4 members", () => {
    expect(Object.keys(SweepStatus)).toHaveLength(4);
  });
});

describe("SearchStrategy enum", () => {
  it("has correct string values matching backend", () => {
    expect(SearchStrategy.GRID).toBe("grid");
    expect(SearchStrategy.RANDOM).toBe("random");
  });
});

describe("SweepGoal enum", () => {
  it("has correct string values matching backend", () => {
    expect(SweepGoal.MAXIMIZE).toBe("maximize");
    expect(SweepGoal.MINIMIZE).toBe("minimize");
  });
});

describe("Sweep interface", () => {
  const sampleSweep: Sweep = {
    id: 7,
    project_id: 1,
    experiment_id: 1,
    trainer_name: "random_forest",
    dataset_path: "datasets/1/dataset.csv",
    target_column: "target",
    feature_columns: ["f1", "f2"],
    search_space: { n_estimators: [100, 200], max_depth: [5, 10] },
    strategy: SearchStrategy.GRID,
    max_combinations: null,
    metric: "accuracy",
    goal: SweepGoal.MAXIMIZE,
    status: SweepStatus.RUNNING,
    best_run_id: null,
    created_at: "2026-01-01T00:00:00Z",
    started_at: "2026-01-01T00:01:00Z",
    finished_at: null,
    run_ids: [11, 12, 13, 14],
  };

  it("accepts a valid full sweep object", () => {
    expect(sampleSweep.id).toBe(7);
    expect(sampleSweep.strategy).toBe(SearchStrategy.GRID);
    expect(sampleSweep.run_ids).toHaveLength(4);
  });

  it("accepts a completed sweep with a best run", () => {
    const completed: Sweep = {
      ...sampleSweep,
      status: SweepStatus.COMPLETED,
      best_run_id: 12,
      finished_at: "2026-01-01T00:05:00Z",
    };
    expect(completed.best_run_id).toBe(12);
    expect(completed.status).toBe(SweepStatus.COMPLETED);
  });

  it("contains all expected keys", () => {
    const keys = Object.keys(sampleSweep).sort();
    expect(keys).toEqual(
      [
        "id",
        "project_id",
        "experiment_id",
        "trainer_name",
        "dataset_path",
        "target_column",
        "feature_columns",
        "search_space",
        "strategy",
        "max_combinations",
        "metric",
        "goal",
        "status",
        "best_run_id",
        "created_at",
        "started_at",
        "finished_at",
        "run_ids",
      ].sort(),
    );
  });
});

describe("SweepCreate interface", () => {
  it("accepts a valid grid sweep request", () => {
    const req: SweepCreate = {
      project_id: 1,
      experiment_id: 1,
      trainer_name: "random_forest",
      dataset_path: "datasets/1/dataset.csv",
      target_column: "target",
      feature_columns: ["f1", "f2"],
      search_space: { n_estimators: [100, 200] },
      strategy: SearchStrategy.GRID,
    };
    expect(req.strategy).toBe(SearchStrategy.GRID);
    expect(req.max_combinations).toBeUndefined();
  });

  it("accepts a random sweep request with trial limit and goal", () => {
    const req: SweepCreate = {
      project_id: 1,
      experiment_id: 1,
      trainer_name: "xgboost",
      dataset_path: "datasets/1/dataset.csv",
      target_column: "target",
      feature_columns: ["f1"],
      search_space: { learning_rate: [0.01, 0.1, 0.3] },
      strategy: SearchStrategy.RANDOM,
      max_combinations: 2,
      metric: "rmse",
      goal: SweepGoal.MINIMIZE,
    };
    expect(req.max_combinations).toBe(2);
    expect(req.goal).toBe(SweepGoal.MINIMIZE);
  });
});
