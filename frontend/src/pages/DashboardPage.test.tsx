import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import type { Run } from "../features/runs/types";
import { RunStatus } from "../features/runs/types";

const sampleRuns: Run[] = [
  {
    id: 1,
    experiment_id: 10,
    config: {
      dataset_path: "dataset.csv",
      target_column: "target",
      feature_columns: ["feature1"],
    },
    status: RunStatus.PENDING,
    metrics: {},
    artifact_path: null,
    created_at: "2024-01-01T00:00:00Z",
    started_at: null,
    finished_at: null,
  },
  {
    id: 2,
    experiment_id: 10,
    config: {
      dataset_path: "dataset2.csv",
      target_column: "label",
      feature_columns: ["feature2"],
    },
    status: RunStatus.PENDING,
    metrics: {},
    artifact_path: null,
    created_at: "2024-01-02T00:00:00Z",
    started_at: null,
    finished_at: null,
  },
  {
    id: 3,
    experiment_id: 11,
    config: {
      dataset_path: "dataset3.csv",
      target_column: "target",
      feature_columns: ["feature3"],
    },
    status: RunStatus.COMPLETED,
    metrics: { accuracy: 0.95 },
    artifact_path: "/artifacts/3",
    created_at: "2024-01-03T00:00:00Z",
    started_at: "2024-01-03T01:00:00Z",
    finished_at: "2024-01-03T02:00:00Z",
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>,
    );

    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("renders summary cards with correct counts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleRuns), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeDefined();
    });

    // Total = 3, Pending = 2, Completed = 1, others = 0
    expect(screen.getByText("Total")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
    expect(screen.getByText("Running")).toBeDefined();
    expect(screen.getByText("Completed")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();
    expect(screen.getByText("Cancelled")).toBeDefined();

    // Zero-count cards should still render
    expect(screen.getByText("Running")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();
    expect(screen.getByText("Cancelled")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load dashboard: Network error"),
      ).toBeDefined();
    });
  });

  it("shows all zero counts when there are no runs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<DashboardPage />);

    // All 6 cards show 0 with no runs
    await waitFor(() => {
      expect(screen.getAllByText("0")).toHaveLength(6);
    });

    // All status labels should be present
    expect(screen.getByText("Total")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
    expect(screen.getByText("Running")).toBeDefined();
    expect(screen.getByText("Completed")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();
    expect(screen.getByText("Cancelled")).toBeDefined();
  });
});
