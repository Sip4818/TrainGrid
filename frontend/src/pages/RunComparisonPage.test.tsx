import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { RunComparisonPage } from "./RunComparisonPage";
import type { RunComparisonResponse } from "../features/runs/types";
import { RunStatus } from "../features/runs/types";

const comparison: RunComparisonResponse = {
  runs: [
    {
      id: 1,
      experiment_id: 10,
      trainer_name: "random_forest",
      status: RunStatus.COMPLETED,
      config: {
        dataset_path: "dataset.csv",
        target_column: "target",
        feature_columns: ["a"],
        n_estimators: 100,
        max_depth: null,
      },
      metrics: { accuracy: 0.95 },
    },
    {
      id: 2,
      experiment_id: 10,
      trainer_name: "xgboost",
      status: RunStatus.COMPLETED,
      config: {
        dataset_path: "dataset.csv",
        target_column: "target",
        feature_columns: ["a"],
        n_estimators: 100,
        learning_rate: 0.1,
      },
      metrics: { accuracy: 0.97 },
    },
  ],
  metrics: ["accuracy"],
};

function renderWithProviders(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <RunComparisonPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RunComparisonPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>,
    );

    renderWithProviders("/runs/compare?experiment_id=10&run_ids=1&run_ids=2");

    expect(screen.getByRole("status")).toBeDefined();
  });

  it("renders side-by-side config and metrics matrix after load", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(comparison), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders("/runs/compare?experiment_id=10&run_ids=1&run_ids=2");

    await waitFor(() => {
      expect(screen.getByText("accuracy")).toBeDefined();
    });

    // Page describes the scoped experiment
    expect(screen.getByText("Experiment #10")).toBeDefined();

    // Config rows
    expect(screen.getByText("n_estimators")).toBeDefined();
    expect(screen.getByText("learning_rate")).toBeDefined();
    expect(screen.getByText("max_depth")).toBeDefined();

    // Metric row values (toPrecision(4))
    expect(screen.getByText("0.9500")).toBeDefined();
    expect(screen.getByText("0.9700")).toBeDefined();

    // Config row values
    expect(screen.getByText("100")).toBeDefined();
    expect(screen.getByText("0.1000")).toBeDefined();

    // max_depth cells render as em dash (null / undefined)
    expect(screen.getAllByText("\u2014").length).toBeGreaterThanOrEqual(2);

    // Run column labels and status badges
    expect(screen.getByText("Run #1")).toBeDefined();
    expect(screen.getByText("Run #2")).toBeDefined();
    expect(
      screen.getByText(/Run #1 \u2014 random_forest/),
    ).toBeDefined();
    expect(
      screen.getByText(/Run #2 \u2014 xgboost/),
    ).toBeDefined();
  });

  it("shows empty state when no runs are selected", () => {
    renderWithProviders("/runs/compare");

    expect(screen.getByText("Run Comparison")).toBeDefined();
    expect(
      screen.getByText(/Select at least two runs/),
    ).toBeDefined();
    expect(
      screen.getByText(/No runs selected/),
    ).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    renderWithProviders("/runs/compare?experiment_id=10&run_ids=1&run_ids=2");

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load comparison: Network error"),
      ).toBeDefined();
    });
  });
});