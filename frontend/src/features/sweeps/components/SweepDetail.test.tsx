import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SweepDetail } from "./SweepDetail";
import type { Sweep } from "../types";
import { SearchStrategy, SweepGoal, SweepStatus } from "../types";
import type { Run } from "../../runs/types";
import { RunStatus } from "../../runs/types";

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
  status: SweepStatus.COMPLETED,
  best_run_id: 12,
  created_at: "2026-01-01T00:00:00Z",
  started_at: "2026-01-01T00:01:00Z",
  finished_at: "2026-01-01T00:05:00Z",
  run_ids: [11, 12],
};

function makeRun(
  id: number,
  status: RunStatus,
  config: Record<string, unknown>,
  metrics: Record<string, unknown>,
): Run {
  return {
    id,
    project_id: 1,
    experiment_id: 1,
    config: {
      dataset_path: "datasets/1/dataset.csv",
      target_column: "target",
      feature_columns: ["f1", "f2"],
      ...config,
    },
    status,
    metrics,
    artifact_path: null,
    created_at: "2026-01-01T00:00:00Z",
    started_at: null,
    finished_at: null,
  };
}

const childRuns: Run[] = [
  makeRun(
    11,
    RunStatus.COMPLETED,
    { trainer_name: "random_forest", n_estimators: 100, max_depth: 5 },
    { accuracy: 0.91 },
  ),
  makeRun(
    12,
    RunStatus.COMPLETED,
    { trainer_name: "random_forest", n_estimators: 200, max_depth: 10 },
    { accuracy: 0.95 },
  ),
];

describe("SweepDetail", () => {
  it("renders sweep header with status", () => {
    render(
      <SweepDetail
        sweep={sampleSweep}
        childRuns={childRuns}
        onBack={() => {}}
        onSelectRun={() => {}}
      />,
    );
    expect(screen.getByText("Sweep #7")).toBeDefined();
    expect(screen.getAllByText("completed")).toHaveLength(3);
    expect(screen.getByText(/random_forest/)).toBeDefined();
  });

  it("highlights the best run with a link", () => {
    const onSelectRun = vi.fn();
    render(
      <SweepDetail
        sweep={sampleSweep}
        childRuns={childRuns}
        onBack={() => {}}
        onSelectRun={onSelectRun}
      />,
    );
    screen.getByText("Run #12").click();
    expect(onSelectRun).toHaveBeenCalledWith(12);
  });

  it("renders one row per child run with hyperparameters and metric", () => {
    render(
      <SweepDetail
        sweep={sampleSweep}
        childRuns={childRuns}
        onBack={() => {}}
        onSelectRun={() => {}}
      />,
    );
    expect(screen.getByText("n_estimators=100, max_depth=5")).toBeDefined();
    expect(screen.getByText("n_estimators=200, max_depth=10")).toBeDefined();
    expect(screen.getByText("0.9100")).toBeDefined();
    expect(screen.getByText("0.9500")).toBeDefined();
  });

  it("shows dash when a run lacks the metric", () => {
    const runs = [
      makeRun(11, RunStatus.FAILED, { n_estimators: 100 }, {}),
    ];
    render(
      <SweepDetail
        sweep={{ ...sampleSweep, status: SweepStatus.FAILED, best_run_id: null }}
        childRuns={runs}
        onBack={() => {}}
        onSelectRun={() => {}}
      />,
    );
    expect(screen.getByText("—")).toBeDefined();
    expect(
      screen.getByText(/no completed runs produced the target metric/),
    ).toBeDefined();
  });

  it("shows training note while running", () => {
    render(
      <SweepDetail
        sweep={{ ...sampleSweep, status: SweepStatus.RUNNING, best_run_id: null }}
        childRuns={[]}
        onBack={() => {}}
        onSelectRun={() => {}}
      />,
    );
    expect(screen.getByText(/Training in progress/)).toBeDefined();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(
      <SweepDetail
        sweep={sampleSweep}
        childRuns={childRuns}
        onBack={onBack}
        onSelectRun={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("← Back"));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
