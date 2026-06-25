import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { RunsPage } from "./RunsPage";
import type { Run } from "../features/runs/types";
import { RunStatus } from "../features/runs/types";


const sampleRun: Run = {
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
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RunsPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>
    );
    renderWithProviders(<RunsPage />);
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("renders runs table after load", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([sampleRun]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<RunsPage />);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeDefined();
    });
    expect(screen.getByText("pending")).toBeDefined();
    expect(screen.getByText("New Run")).toBeDefined();
  });

  it("opens create run modal on button click", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<RunsPage />);

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));
  });
});
