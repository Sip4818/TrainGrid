import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

function renderWithProviders(
  ui: React.ReactElement,
  options: { initialEntries?: string[] } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options.initialEntries}>{ui}</MemoryRouter>
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

  it("filters runs by status from the URL query param", async () => {
    const runs = [
      { ...sampleRun, id: 1, status: RunStatus.PENDING },
      { ...sampleRun, id: 2, status: RunStatus.COMPLETED },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(runs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<RunsPage />, {
      initialEntries: ["/runs?status=pending"],
    });

    await waitFor(() => {
      expect(screen.getByText("1")).toBeDefined();
    });
    expect(screen.getByText("pending")).toBeDefined();
    expect(screen.queryByText("completed")).toBeNull();
  });

  it("filters runs via the status dropdown selector", async () => {
    const runs = [
      { ...sampleRun, id: 1, status: RunStatus.PENDING },
      { ...sampleRun, id: 2, status: RunStatus.COMPLETED },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(runs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<RunsPage />);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeDefined();
    });
    expect(screen.getByLabelText("Filter by status")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "completed" },
    });

    expect(screen.queryByText("pending")).toBeNull();
    expect(screen.getByText("completed")).toBeDefined();
  });

  it("shows all runs when the status filter is cleared", async () => {
    const runs = [
      { ...sampleRun, id: 1, status: RunStatus.PENDING },
      { ...sampleRun, id: 2, status: RunStatus.COMPLETED },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(runs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<RunsPage />, {
      initialEntries: ["/runs?status=pending"],
    });

    await waitFor(() => {
      expect(screen.getByText("1")).toBeDefined();
    });
    expect(screen.queryByText("completed")).toBeNull();

    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "" },
    });

    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("pending")).toBeDefined();
    expect(screen.getByText("completed")).toBeDefined();
  });
});
