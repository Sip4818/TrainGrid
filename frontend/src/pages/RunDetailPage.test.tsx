import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RunDetailPage } from "./RunDetailPage";
import type { Run } from "../features/runs/types";
import { RunStatus } from "../features/runs/types";

const sampleRun: Run = {
  id: 1,
  project_id: 1,
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

const sampleExperiment = {
  id: 10,
  project_id: 1,
  name: "Test Experiment",
  created_at: "2024-01-01T00:00:00Z",
  run_count: 1,
};

function renderWithProviders(
  ui: React.ReactElement,
  { route = "/projects/1/experiments/10/runs/1" }: { route?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="projects/:projectId/experiments/:experimentId/runs/:runId" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Minimal EventSource stand-in mirroring hooks-stream.test.tsx,
 * so the page can be driven with deterministic stream events.
 */
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((message: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }

  emit(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
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
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/experiments/")) {
        return new Response(JSON.stringify(sampleExperiment), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(sampleRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

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
    expect(screen.getByText("Back to Experiment")).toBeDefined();
  });

  it("shows metrics when run has them", async () => {
    const completedRun: Run = {
      ...sampleRun,
      status: RunStatus.COMPLETED,
      metrics: { accuracy: 0.95, f1_score: 0.93 },
      finished_at: "2024-06-01T12:05:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/experiments/")) {
        return new Response(JSON.stringify(sampleExperiment), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(completedRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

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
    expect(screen.getByText("Back to Experiment")).toBeDefined();
  });

  it("shows invalid run ID for non-numeric IDs", () => {
    renderWithProviders(<RunDetailPage />, { route: "/projects/1/experiments/10/runs/abc" });

    expect(screen.getByText("Invalid Run")).toBeDefined();
    expect(
      screen.getByText("No valid run ID provided."),
    ).toBeDefined();
  });

  it("hides the live view for completed runs", async () => {
    const completedRun: Run = {
      ...sampleRun,
      status: RunStatus.COMPLETED,
      metrics: { accuracy: 0.95 },
      finished_at: "2024-06-01T12:05:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/experiments/")) {
        return new Response(JSON.stringify(sampleExperiment), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(completedRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<RunDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeDefined();
    });

    expect(screen.queryByText("Live Training")).toBeNull();
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("shows the live training view as stream events arrive", async () => {
    const runningRun: Run = {
      ...sampleRun,
      status: RunStatus.RUNNING,
      started_at: "2024-06-01T12:01:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/experiments/")) {
        return new Response(JSON.stringify(sampleExperiment), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(runningRun), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal(
      "EventSource",
      MockEventSource as unknown as typeof EventSource,
    );

    renderWithProviders(<RunDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Running")).toBeDefined();
    });
    await waitFor(() =>
      expect(MockEventSource.instances).toHaveLength(1),
    );

    act(() => {
      MockEventSource.instances[0]!.emit({
        type: "epoch",
        epoch: 1,
        total_epochs: 2,
        loss: 0.5,
        val_loss: 0.4,
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Live Training")).toBeDefined();
    });
    expect(
      screen.getByRole("img", { name: "Live training loss curve" }),
    ).toBeDefined();
    expect(
      screen.getByText("epoch 1/2 loss=0.5000 val_loss=0.4000"),
    ).toBeDefined();
  });
});
