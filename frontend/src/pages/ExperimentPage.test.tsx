import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ExperimentPage } from "./ExperimentPage";
import type { Run } from "../features/runs/types";
import { RunStatus } from "../features/runs/types";

const sampleRun: Run = {
  id: 1,
  project_id: 1,
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

const sampleExperiment = {
  id: 10,
  project_id: 1,
  name: "Test Experiment",
  created_at: "2024-01-01T00:00:00Z",
  run_count: 1,
};

const randomForestSchema = {
  type: "object",
  properties: {
    dataset_path: {
      title: "Dataset Path",
      type: "string",
      x_widget: "dataset",
    },
    target_column: { title: "Target Column", type: "string" },
    feature_columns: {
      title: "Feature Columns",
      type: "array",
      items: { type: "string" },
    },
    n_estimators: { title: "N Estimators", type: "integer", default: 100 },
    max_depth: {
      title: "Max Depth",
      anyOf: [{ type: "integer" }, { type: "null" }],
      default: null,
    },
  },
  required: ["dataset_path", "target_column", "feature_columns"],
};

const xgboostSchema = {
  type: "object",
  properties: {
    ...randomForestSchema.properties,
    max_depth: { title: "Max Depth", type: "integer", default: 6 },
    learning_rate: { title: "Learning Rate", type: "number", default: 0.3 },
  },
  required: ["dataset_path", "target_column", "feature_columns"],
};

const defaultTrainers = [
  {
    name: "random_forest",
    label: "Random Forest Classifier",
    config_schema: randomForestSchema,
  },
  { name: "xgboost", label: "XGBoost Classifier", config_schema: xgboostSchema },
];

function mockApi(
  runs: unknown[] = [],
  trainers: unknown[] = defaultTrainers,
  experiment: unknown = sampleExperiment,
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input, init) => {
      const method = (init?.method as string | undefined) ?? "GET";
      if (method === "POST") {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const url = String(input);
      if (url.includes("/datasets/")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/experiments/")) {
        return new Response(JSON.stringify(experiment), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const body = url.includes("/trainers/") ? trainers : runs;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
}

function renderWithProviders(
  ui: React.ReactElement,
  options: { initialEntries?: string[]; routePath?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const routePath = options.routePath ?? "/projects/:projectId/experiments/:experimentId";
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options.initialEntries}>
        <Routes>
          <Route path={routePath} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ExperimentPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>
    );
    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("renders runs table after load", async () => {
    mockApi([sampleRun]);

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

    await waitFor(() => {
      expect(screen.getByText("1")).toBeDefined();
    });
    expect(screen.getByText("pending")).toBeDefined();
    expect(screen.getByText("New Run")).toBeDefined();
  });

  it("displays the experiment name in the page header", async () => {
    mockApi([sampleRun]);

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

    await waitFor(() => {
      expect(screen.getByText("Test Experiment")).toBeDefined();
    });
  });

  it("opens create run modal on button click", async () => {
    mockApi();

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));
  });

  it("does not show experiment ID input in create modal", async () => {
    mockApi();

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    expect(screen.queryByLabelText("Experiment ID")).toBeNull();
  });

  it("filters runs by status from the URL query param", async () => {
    const runs = [
      { ...sampleRun, id: 1, status: RunStatus.PENDING },
      { ...sampleRun, id: 2, status: RunStatus.COMPLETED },
    ];
    mockApi(runs);

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10?status=pending"],
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
    mockApi(runs);

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

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
    mockApi(runs);

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10?status=pending"],
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

  it("shows the model dropdown with classifier options in the create modal", async () => {
    mockApi();

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    expect(screen.getByLabelText("Model")).toBeDefined();
    expect(screen.getByText("Random Forest Classifier")).toBeDefined();
    expect(screen.getByText("XGBoost Classifier")).toBeDefined();
  });

  it("reveals the learning rate field only when xgboost is selected", async () => {
    mockApi();

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    expect(screen.queryByLabelText("Learning Rate")).toBeNull();

    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "xgboost" },
    });
    expect(screen.getByLabelText("Learning Rate")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "random_forest" },
    });
    expect(screen.queryByLabelText("Learning Rate")).toBeNull();
  });

  it("navigates to run detail page with scoped URL on row click", async () => {
    renderWithRouter([sampleRun]);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeDefined();
    });

    const row = screen.getByText("1").closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByTestId("location")?.textContent).toBe(
        "/projects/1/experiments/10/runs/1",
      );
    });
  });
});

function LocationSpy(): ReactElement {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderWithRouter(runs: unknown[]): void {
  mockApi(runs);
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/projects/1/experiments/10"]}>
        <LocationSpy />
        <Routes>
          <Route
            path="/projects/:projectId/experiments/:experimentId"
            element={<ExperimentPage />}
          />
          <Route
            path="/projects/:projectId/experiments/:experimentId/compare"
            element={<div data-testid="compare-page">compare page</div>}
          />
          <Route
            path="/projects/:projectId/experiments/:experimentId/runs/:runId"
            element={<div data-testid="run-detail">run detail</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ExperimentPage comparison selection", () => {
  const sameExperimentRuns = [
    { ...sampleRun, id: 1, experiment_id: 10, status: RunStatus.COMPLETED },
    { ...sampleRun, id: 2, experiment_id: 10, status: RunStatus.COMPLETED },
    { ...sampleRun, id: 3, experiment_id: 10, status: RunStatus.COMPLETED },
    { ...sampleRun, id: 4, experiment_id: 10, status: RunStatus.COMPLETED },
  ];

  it("disables compare until at least two runs are selected", async () => {
    renderWithRouter(sameExperimentRuns);

    await waitFor(() => {
      expect(screen.getByLabelText("Compare run 1")).toBeDefined();
    });

    expect(screen.getByRole("button", { name: /Compare \(0\)/ })).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Compare run 1"));
    expect(screen.getByRole("button", { name: /Compare \(1\)/ })).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Compare run 2"));
    expect(screen.getByRole("button", { name: /Compare \(2\)/ })).toBeEnabled();
  });

  it("navigates to the comparison page with scoped URL and run ids", async () => {
    renderWithRouter(sameExperimentRuns);

    await waitFor(() => {
      expect(screen.getByLabelText("Compare run 1")).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText("Compare run 1"));
    fireEvent.click(screen.getByLabelText("Compare run 2"));
    fireEvent.click(screen.getByRole("button", { name: /Compare \(2\)/ }));

    await waitFor(() => {
      expect(screen.getByTestId("compare-page")).toBeDefined();
    });
    expect(screen.getByTestId("location").textContent).toBe(
      "/projects/1/experiments/10/compare?run_ids=1&run_ids=2",
    );
  });

  it("caps selection at three runs", async () => {
    renderWithRouter(sameExperimentRuns);

    await waitFor(() => {
      expect(screen.getByLabelText("Compare run 1")).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText("Compare run 1"));
    fireEvent.click(screen.getByLabelText("Compare run 2"));
    fireEvent.click(screen.getByLabelText("Compare run 3"));
    fireEvent.click(screen.getByLabelText("Compare run 4"));

    expect(screen.getByText("Select up to 3 runs to compare.")).toBeDefined();
    const checkbox4 = screen.getByLabelText(
      "Compare run 4",
    ) as HTMLInputElement;
    expect(checkbox4.checked).toBe(false);
  });
});

describe("ExperimentPage dataset picker", () => {
  it("lists uploaded datasets in the create modal picker", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const method = (init?.method as string | undefined) ?? "GET";
      const url = String(input);
      if (method === "POST") {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/datasets/")) {
        return new Response(
          JSON.stringify([{ store_key: "datasets/1/dataset.csv", name: "iris.csv" }]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      if (url.includes("/experiments/")) {
        return new Response(JSON.stringify(sampleExperiment), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const body = url.includes("/trainers/") ? defaultTrainers : [];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "random_forest" },
    });
    await waitFor(() => screen.getByLabelText("Dataset Path"));

    expect(screen.getByText("iris.csv")).toBeDefined();
  });

  it("sends project_id and experiment_id in the create-run payload", async () => {
    let postedBody: Record<string, unknown> | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const method = (init?.method as string | undefined) ?? "GET";
      const url = String(input);
      if (method === "POST") {
        postedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/datasets/")) {
        return new Response(
          JSON.stringify([{ store_key: "datasets/1/dataset.csv", name: "iris.csv" }]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      if (url.includes("/experiments/")) {
        return new Response(JSON.stringify(sampleExperiment), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const body = url.includes("/trainers/") ? defaultTrainers : [];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<ExperimentPage />, {
      initialEntries: ["/projects/1/experiments/10"],
    });

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "random_forest" },
    });
    await waitFor(() => screen.getByLabelText("Dataset Path"));
    fireEvent.change(screen.getByLabelText("Dataset Path"), {
      target: { value: "datasets/1/dataset.csv" },
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Create Run" }),
      ).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Run" }));

    await waitFor(() => {
      expect(postedBody).not.toBeNull();
    });

    expect(postedBody).toMatchObject({
      project_id: 1,
      experiment_id: 10,
      trainer_name: "random_forest",
    });
  });
});
