import { describe, it, expect, vi, beforeEach } from "vitest";
import { listSweeps, getSweep, createSweep } from "./api";
import type { Sweep, SweepCreate } from "./types";
import { SearchStrategy, SweepGoal, SweepStatus } from "./types";

const BASE_URL = "http://localhost:8000";

const sampleSweep: Sweep = {
  id: 7,
  project_id: 1,
  experiment_id: 1,
  trainer_name: "random_forest",
  dataset_path: "datasets/1/dataset.csv",
  target_column: "target",
  feature_columns: ["f1", "f2"],
  search_space: { n_estimators: [100, 200] },
  strategy: SearchStrategy.GRID,
  max_combinations: null,
  metric: "accuracy",
  goal: SweepGoal.MAXIMIZE,
  status: SweepStatus.RUNNING,
  best_run_id: null,
  created_at: "2026-01-01T00:00:00Z",
  started_at: "2026-01-01T00:01:00Z",
  finished_at: null,
  run_ids: [11, 12],
};

const sampleCreate: SweepCreate = {
  project_id: 1,
  experiment_id: 1,
  trainer_name: "random_forest",
  dataset_path: "datasets/1/dataset.csv",
  target_column: "target",
  feature_columns: ["f1", "f2"],
  search_space: { n_estimators: [100, 200] },
  strategy: SearchStrategy.GRID,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("listSweeps", () => {
  it("returns sweeps list on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([sampleSweep]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listSweeps(1, 1);
    expect(result).toEqual([sampleSweep]);
    expect(result).toHaveLength(1);
  });

  it("calls GET /sweeps/ with scope params", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await listSweeps(1, 2);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      `${BASE_URL}/sweeps/?project_id=1&experiment_id=2`,
    );
  });
});

describe("getSweep", () => {
  it("returns a single sweep on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleSweep), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getSweep(7, 1, 1);
    expect(result).toEqual(sampleSweep);
  });

  it("calls GET /sweeps/{id} with scope params", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleSweep), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getSweep(7, 1, 2);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      `${BASE_URL}/sweeps/7?project_id=1&experiment_id=2`,
    );
  });
});

describe("createSweep", () => {
  it("returns the created sweep on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleSweep), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await createSweep(sampleCreate);
    expect(result).toEqual(sampleSweep);
  });

  it("sends POST to /sweeps/ with payload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleSweep), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await createSweep(sampleCreate);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [unknown, RequestInit];
    expect(String(url)).toBe(`${BASE_URL}/sweeps/`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(sampleCreate);
  });
});
