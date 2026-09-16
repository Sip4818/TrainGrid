import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ModelsPage } from "./ModelsPage";
import { ModelStage } from "../features/models/types";

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const sampleModels = [
  {
    id: 1,
    name: "fraud-detector",
    version: "v1.0.1",
    stage: ModelStage.PRODUCTION,
    metrics: { accuracy: 0.93 },
    created_at: "2026-09-05T00:00:00Z",
  },
  {
    id: 2,
    name: "credit-scorer",
    version: "v2.0.0",
    stage: ModelStage.STAGING,
    metrics: { accuracy: 0.89 },
    created_at: "2026-09-08T00:00:00Z",
  },
  {
    id: 3,
    name: "churn-predictor",
    version: "v1.0.0",
    stage: ModelStage.NONE,
    metrics: {},
    created_at: "2026-09-10T00:00:00Z",
  },
];

function mockApi(models: unknown[] = []) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input, init) => {
      const method = (init?.method as string | undefined) ?? "GET";
      const url = String(input);
      if (method === "POST" && url.includes("/models/") && !url.includes("/versions/")) {
        return new Response(JSON.stringify({}), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(models), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
}

function renderWithProviders(
  ui: ReactElement,
  options: { initialEntries?: string[] } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options.initialEntries ?? ["/models"]}>
        <Routes>
          <Route path="/models" element={ui} />
          <Route path="/deployments" element={<div>deployments</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  navigateMock.mockClear();
});

describe("ModelsPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>,
    );

    renderWithProviders(<ModelsPage />);
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText("Model Registry")).toBeDefined();
  });

  it("renders models table after load", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });
    expect(screen.getByText("credit-scorer")).toBeDefined();
    expect(screen.getByText("churn-predictor")).toBeDefined();
    expect(screen.getByText("v1.0.1")).toBeDefined();
    expect(screen.getByText("v2.0.0")).toBeDefined();
  });

  it("displays stage badges", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("production")).toBeDefined();
    });
    expect(screen.getByText("staging")).toBeDefined();
    expect(screen.getByText("none")).toBeDefined();
  });

  it("displays accuracy from metrics", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("0.9300")).toBeDefined();
    });
    expect(screen.getByText("0.8900")).toBeDefined();
  });

  it("shows dash when metrics have no accuracy", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });
    expect(screen.getByText("—")).toBeDefined();
  });

  it("opens register modal on button click", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => screen.getByText("Register Model"));
    screen.getByText("Register Model").click();
    await waitFor(() => {
      expect(screen.getByText("Model Name")).toBeDefined();
    });
  });

  it("shows empty state when no models are registered", async () => {
    mockApi([]);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/No models registered yet/),
      ).toBeDefined();
    });
  });

  it("filters models by stage using dropdown", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });

    const filterSelect = screen.getByRole("combobox");
    fireEvent.change(filterSelect, { target: { value: ModelStage.PRODUCTION } });

    expect(screen.getByText("fraud-detector")).toBeDefined();
    expect(screen.queryByText("credit-scorer")).toBeNull();
    expect(screen.queryByText("churn-predictor")).toBeNull();
  });

  it("shows all models when filter is cleared", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });

    const filterSelect = screen.getByRole("combobox");
    fireEvent.change(filterSelect, { target: { value: ModelStage.PRODUCTION } });
    expect(screen.queryByText("credit-scorer")).toBeNull();

    fireEvent.change(filterSelect, { target: { value: "" } });
    expect(screen.getByText("credit-scorer")).toBeDefined();
    expect(screen.getByText("churn-predictor")).toBeDefined();
  });

  it("shows filtered empty state when no models match filter", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });

    const filterSelect = screen.getByRole("combobox");
    fireEvent.change(filterSelect, { target: { value: ModelStage.ARCHIVED } });

    expect(
      screen.getByText(/No models match the selected stage filter/),
    ).toBeDefined();
  });

  it("navigates to model detail on row click", async () => {
    mockApi(sampleModels);

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });

    screen.getByText("fraud-detector").click();

    await waitFor(() => {
      expect(screen.getByText("← Back")).toBeDefined();
    });
  });

  it("shows version history in model detail view", async () => {
    const versions = [
      {
        id: 1,
        name: "fraud-detector",
        version: "v1.0.1",
        stage: ModelStage.PRODUCTION,
        run_id: 5,
        description: "Latest version",
        artifact_path: "runs/5/model.joblib",
        artifact_checksum: "abc",
        dataset_hash: "def",
        config: { n_estimators: 100 },
        metrics: { accuracy: 0.95 },
        created_at: "2026-09-05T00:00:00Z",
        updated_at: "2026-09-06T00:00:00Z",
      },
      {
        id: 2,
        name: "fraud-detector",
        version: "v1.0.0",
        stage: ModelStage.ARCHIVED,
        run_id: 3,
        description: null,
        artifact_path: "runs/3/model.joblib",
        artifact_checksum: null,
        dataset_hash: null,
        config: {},
        metrics: {},
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-02T00:00:00Z",
      },
    ];

    mockApi(sampleModels);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/versions")) {
        return new Response(JSON.stringify(versions), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(sampleModels), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });

    screen.getByText("fraud-detector").click();

    await waitFor(() => {
      expect(screen.getByText("Version History")).toBeDefined();
    });
    expect(screen.getByText("v1.0.1")).toBeDefined();
    expect(screen.getByText("v1.0.0")).toBeDefined();
    expect(screen.getByText("Latest version")).toBeDefined();
  });

  it("back button returns to models list", async () => {
    mockApi(sampleModels);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/versions")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(sampleModels), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<ModelsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });

    screen.getByText("fraud-detector").click();
    await waitFor(() => {
      expect(screen.getByText("← Back")).toBeDefined();
    });

    screen.getByText("← Back").click();
    await waitFor(() => {
      expect(screen.getByText("Model Registry")).toBeDefined();
    });
  });
});
