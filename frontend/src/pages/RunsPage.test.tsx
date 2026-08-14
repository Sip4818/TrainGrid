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

const randomForestSchema = {
  type: "object",
  properties: {
    dataset_path: { title: "Dataset Path", type: "string" },
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

function mockApi(runs: unknown[] = [], trainers: unknown[] = defaultTrainers) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input, init) => {
      const method = (init?.method as string | undefined) ?? "GET";
      if (method === "POST") {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const body = String(input).includes("/trainers/") ? trainers : runs;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
}

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
    mockApi([sampleRun]);

    renderWithProviders(<RunsPage />);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeDefined();
    });
    expect(screen.getByText("pending")).toBeDefined();
    expect(screen.getByText("New Run")).toBeDefined();
  });

  it("opens create run modal on button click", async () => {
    mockApi();

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
    mockApi(runs);

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
    mockApi(runs);

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
    mockApi(runs);

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

  it("shows the model dropdown with classifier options in the create modal", async () => {
    mockApi();

    renderWithProviders(<RunsPage />);

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    expect(screen.getByLabelText("Model")).toBeDefined();
    expect(screen.getByText("Random Forest Classifier")).toBeDefined();
    expect(screen.getByText("XGBoost Classifier")).toBeDefined();
  });

  it("uses the model options returned by the trainers endpoint", async () => {
    mockApi([], [
      { name: "logreg", label: "Logistic Regression", config_schema: {} },
    ]);

    renderWithProviders(<RunsPage />);

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    expect(screen.getByText("Logistic Regression")).toBeDefined();
    expect(screen.queryByText("Random Forest Classifier")).toBeNull();
  });

  it("shows an error and disables creation when the trainers endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("/trainers/")) {
        return new Response(JSON.stringify({ message: "Internal error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<RunsPage />);

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    expect(screen.getByText(/Couldn't load models/)).toBeDefined();
    expect(screen.queryByLabelText("Dataset Path")).toBeNull();
    expect(screen.getByRole("button", { name: "Create Run" })).toBeDisabled();
  });

  it("shows a loading message while models are still loading", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("/trainers/")) {
        return new Promise(() => {}) as Promise<Response>;
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<RunsPage />);

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    expect(screen.getByText("Loading models...")).toBeDefined();
    expect(screen.getByRole("button", { name: "Create Run" })).toBeDisabled();
  });

  it("reveals the learning rate field only when xgboost is selected", async () => {
    mockApi();

    renderWithProviders(<RunsPage />);

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

  it("renders config fields from the selected trainer's schema", async () => {
    mockApi([], [
      {
        name: "logreg",
        label: "Logistic Regression",
        config_schema: {
          type: "object",
          properties: {
            dataset_path: { title: "Dataset Path", type: "string" },
            target_column: { title: "Target Column", type: "string" },
            feature_columns: {
              title: "Feature Columns",
              type: "array",
              items: { type: "string" },
            },
            penalty: { title: "Penalty", type: "string", enum: ["l1", "l2"] },
            max_iter: { title: "Max Iter", type: "integer", default: 500 },
          },
          required: ["dataset_path", "target_column", "feature_columns"],
        },
      },
    ]);

    renderWithProviders(<RunsPage />);

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "logreg" },
    });

    expect(screen.getByLabelText("Max Iter")).toBeInTheDocument();
    expect(screen.getByLabelText("Max Iter")).toHaveValue(500);
    expect(screen.getByLabelText("Penalty")).toBeInTheDocument();
    expect(screen.queryByLabelText("Learning Rate")).toBeNull();
  });

  it("submits the chosen trainer_name with learning_rate and omits empty config fields", async () => {
    let postedBody: Record<string, unknown> | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const method = (init?.method as string | undefined) ?? "GET";
      if (method === "POST") {
        postedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const body = String(input).includes("/trainers/") ? defaultTrainers : [];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<RunsPage />);

    await waitFor(() => screen.getByText("New Run"));
    screen.getByText("New Run").click();
    await waitFor(() => screen.getByText("Create Training Run"));

    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "xgboost" },
    });
    fireEvent.change(screen.getByLabelText("Max Depth"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Learning Rate"), {
      target: { value: "0.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Run" }));

    await waitFor(() => {
      expect(postedBody).not.toBeNull();
    });

    expect(postedBody).toMatchObject({
      experiment_id: 1,
      trainer_name: "xgboost",
      config: {
        dataset_path: "backend/datasets/sample.csv",
        target_column: "target",
        feature_columns: ["feature1", "feature2"],
        n_estimators: 100,
        learning_rate: 0.1,
      },
    });
    const config = postedBody!.config as Record<string, unknown>;
    expect("max_depth" in config).toBe(false);
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
      <MemoryRouter initialEntries={["/runs"]}>
        <LocationSpy />
        <Routes>
          <Route path="/runs" element={<RunsPage />} />
          <Route
            path="/runs/compare"
            element={<div data-testid="compare-page">compare page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RunsPage comparison selection", () => {
  const sameExperimentRuns = [
    { ...sampleRun, id: 1, experiment_id: 1, status: RunStatus.COMPLETED },
    { ...sampleRun, id: 2, experiment_id: 1, status: RunStatus.COMPLETED },
    { ...sampleRun, id: 3, experiment_id: 1, status: RunStatus.COMPLETED },
    { ...sampleRun, id: 4, experiment_id: 1, status: RunStatus.COMPLETED },
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

  it("navigates to the comparison page with experiment and run ids", async () => {
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
      "/runs/compare?experiment_id=1&run_ids=1&run_ids=2",
    );
  });

  it("blocks selecting runs from a different experiment", async () => {
    const mixedExperimentRuns = [
      { ...sampleRun, id: 1, experiment_id: 1, status: RunStatus.COMPLETED },
      { ...sampleRun, id: 2, experiment_id: 2, status: RunStatus.COMPLETED },
    ];
    renderWithRouter(mixedExperimentRuns);

    await waitFor(() => {
      expect(screen.getByLabelText("Compare run 1")).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText("Compare run 1"));
    fireEvent.click(screen.getByLabelText("Compare run 2"));

    expect(
      screen.getByText("Runs must belong to the same experiment to compare."),
    ).toBeDefined();
    const checkbox2 = screen.getByLabelText(
      "Compare run 2",
    ) as HTMLInputElement;
    expect(checkbox2.checked).toBe(false);
    expect(screen.getByRole("button", { name: /Compare \(1\)/ })).toBeDisabled();
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
