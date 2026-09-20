import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useSweeps, useCreateSweep } from "./hooks";
import type { Sweep, SweepCreate } from "./types";
import { SearchStrategy, SweepGoal, SweepStatus } from "./types";

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

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function mockGet(sweeps: Sweep[]) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(sweeps), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useSweeps", () => {
  it("returns sweeps for the experiment", async () => {
    mockGet([sampleSweep]);

    const { result } = renderHook(() => useSweeps(1, 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleSweep]);
  });

  // Polling tests use real timers against the 3s refetch interval.
  it(
    "polls while a sweep is active",
    { timeout: 15000 },
    async () => {
      const fetchSpy = mockGet([sampleSweep]);

      renderHook(() => useSweeps(1, 1), { wrapper });

      await waitFor(() => expect(fetchSpy.mock.calls.length).toBe(1));
      await waitFor(() => expect(fetchSpy.mock.calls.length).toBe(2), {
        timeout: 10000,
      });
    },
  );

  it(
    "does not poll once all sweeps are terminal",
    { timeout: 15000 },
    async () => {
      const fetchSpy = mockGet([
        { ...sampleSweep, status: SweepStatus.COMPLETED, best_run_id: 11 },
      ]);

      renderHook(() => useSweeps(1, 1), { wrapper });

      await waitFor(() => expect(fetchSpy.mock.calls.length).toBe(1));
      // One full interval passes with no additional fetch.
      await new Promise((resolve) => setTimeout(resolve, 3600));
      expect(fetchSpy.mock.calls.length).toBe(1);
    },
  );
});

describe("useCreateSweep", () => {
  it("posts the sweep payload and returns the created sweep", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(sampleSweep), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useCreateSweep(), { wrapper });

    const payload: SweepCreate = {
      project_id: 1,
      experiment_id: 1,
      trainer_name: "random_forest",
      dataset_path: "datasets/1/dataset.csv",
      target_column: "target",
      feature_columns: ["f1", "f2"],
      search_space: { n_estimators: [100, 200] },
      strategy: SearchStrategy.GRID,
    };
    let created: Sweep | undefined;
    result.current.mutateAsync(payload).then((sweep) => {
      created = sweep;
    });

    await waitFor(() => expect(created).toEqual(sampleSweep));
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [unknown, RequestInit];
    expect(JSON.parse(init?.body as string)).toEqual(payload);
  });
});
