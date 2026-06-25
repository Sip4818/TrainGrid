import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RunDetailPage } from "./RunDetailPage";
import type { Run } from "../features/runs/types";
import { RunStatus } from "../features/runs/types";

const sampleRun: Run = {
  id: 1,
  experiment_id: 10,
  config: {
    dataset_path: "dataset.csv",
    target_column: "target",
    feature_columns: ["feature1", "feature2"],
    n_estimators: 100,
    max_depth: null,
  },
  status: RunStatus.PENDING,
  metrics: {},
  artifact_path: null,
  created_at: "2024-06-01T12:00:00Z",
  started_at: null,
  finished_at: null,
};

function renderWithProviders(
  ui: React.ReactElement,
  { route = "/runs/1" }: { route?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="runs/:runId" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RunDetailPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>,
    );

    renderWithProviders(<RunDetailPage />);

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText("Loading run details...")).toBeDefined();
  });

  it("renders run details after successful load", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<RunDetailPage />);

    // Wait for data-specific content (not present in loading state)
    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeDefined();
    });

    // Header description includes experiment ID and status
    expect(screen.getByText(/Experiment #10/)).toBeDefined();

    // Status badge
    expect(screen.getByText("Pending")).toBeDefined();

    // Config section
    expect(screen.getByText("Configuration")).toBeDefined();
    expect(screen.getByText("dataset.csv")).toBeDefined();
    expect(screen.getByText("target")).toBeDefined();
    expect(screen.getByText("feature1, feature2")).toBeDefined();
    expect(screen.getByText("100")).toBeDefined();
    expect(screen.getByText("Unlimited")).toBeDefined();

    // Timeline section
    expect(screen.getByText("Timeline")).toBeDefined();

    // Metrics section shows empty state
    expect(screen.getByText("Metrics")).toBeDefined();
    expect(screen.getByText("No metrics yet.")).toBeDefined();

    // Back button
    expect(screen.getByText("Back to Runs")).toBeDefined();
  });

  it("shows metrics when run has them", async () => {
    const completedRun: Run = {
      ...sampleRun,
      status: RunStatus.COMPLETED,
      metrics: { accuracy: 0.95, f1_score: 0.93 },
      finished_at: "2024-06-01T12:05:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(completedRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<RunDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeDefined();
    });

    // Metrics rendered
    expect(screen.getByText("accuracy")).toBeDefined();
    expect(screen.getByText("0.95")).toBeDefined();
    expect(screen.getByText("f1_score")).toBeDefined();
    expect(screen.getByText("0.93")).toBeDefined();
    expect(screen.queryByText("No metrics yet.")).toBeNull();
  });

  it("shows error state on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    renderWithProviders(<RunDetailPage />);

    // Wait for the error message to appear (specific text avoids ambiguity)
    await waitFor(() => {
      expect(
        screen.getByText("Failed to load run: Network error"),
      ).toBeDefined();
    });

    // Back button still shown
    expect(screen.getByText("Back to Runs")).toBeDefined();
  });

  it("shows invalid run ID for non-numeric IDs", () => {
    renderWithProviders(<RunDetailPage />, { route: "/runs/abc" });

    expect(screen.getByText("Invalid Run")).toBeDefined();
    expect(
      screen.getByText("No valid run ID provided."),
    ).toBeDefined();
  });
});
