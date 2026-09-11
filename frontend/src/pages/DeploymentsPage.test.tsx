import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DeploymentsPage } from "./DeploymentsPage";
import { DeploymentStatus } from "../features/deployments/types";
import { ModelStage } from "../features/models/types";

const sampleDeployment = {
  id: 1,
  model_name: "fraud-detector",
  model_version: "v1.0.0",
  registered_model_id: 1,
  status: DeploymentStatus.ACTIVE,
  created_at: "2026-09-06T00:00:00Z",
  started_at: "2026-09-06T00:01:00Z",
  stopped_at: null,
};

const sampleModels = [
  {
    id: 1,
    name: "fraud-detector",
    version: "v1.0.0",
    stage: ModelStage.PRODUCTION,
    metrics: { accuracy: 0.95 },
    created_at: "2026-09-05T00:00:00Z",
  },
  {
    id: 2,
    name: "fraud-detector",
    version: "v1.1.0",
    stage: ModelStage.STAGING,
    metrics: { accuracy: 0.96 },
    created_at: "2026-09-08T00:00:00Z",
  },
];

function mockApi(
  deployments: unknown[] = [],
  models: unknown[] = sampleModels,
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input, init) => {
      const method = (init?.method as string | undefined) ?? "GET";
      const url = String(input);
      if (url.includes("/models/") && !url.includes("/predict")) {
        return new Response(JSON.stringify(models), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (method === "DELETE") {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (method === "POST") {
        if (url.includes("/predict")) {
          return new Response(
            JSON.stringify({
              predictions: [{ prediction: 1, confidence: 0.87 }],
              latency_ms: 5.0,
              model: "test:v1.0.0",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(deployments), {
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
      <MemoryRouter
        initialEntries={options.initialEntries ?? ["/deployments"]}
      >
        <Routes>
          <Route path="/deployments" element={ui} />
          <Route path="/models" element={<div>models page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("DeploymentsPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>,
    );

    renderWithProviders(<DeploymentsPage />);
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText("Deployments")).toBeDefined();
  });

  it("renders deployments table after load", async () => {
    mockApi([sampleDeployment]);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });
    expect(screen.getByText("v1.0.0")).toBeDefined();
    expect(screen.getByText("active")).toBeDefined();
  });

  it("shows Deploy Model button", async () => {
    mockApi([]);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Deploy Model")).toBeDefined();
    });
  });

  it("opens deploy modal on button click", async () => {
    mockApi([]);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => screen.getByText("Deploy Model"));
    screen.getByText("Deploy Model").click();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Deploy Model" })).toBeDefined();
    });
  });

  it("shows registered models in deploy modal dropdown", async () => {
    mockApi([], sampleModels);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => screen.getByText("Deploy Model"));
    screen.getByText("Deploy Model").click();
    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });
  });

  it("shows empty state when no deployments exist", async () => {
    mockApi([]);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No data")).toBeDefined();
    });
  });

  it("shows test and undeploy buttons for active deployments", async () => {
    mockApi([sampleDeployment]);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });
    expect(screen.getByText("Undeploy")).toBeDefined();
  });

  it("opens predict modal when test button is clicked", async () => {
    mockApi([sampleDeployment]);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    screen.getByText("Test").click();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Test Prediction" })).toBeDefined();
    });
  });

  it("shows JSON input area in predict modal", async () => {
    mockApi([sampleDeployment]);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    screen.getByText("Test").click();
    await waitFor(() => {
      expect(screen.getByText("Features (JSON)")).toBeDefined();
    });
    expect(screen.getByText("Run Prediction")).toBeDefined();
  });

  it("deploys a model from the modal", async () => {
    const fetchMock = mockApi([], sampleModels);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => screen.getByText("Deploy Model"));
    screen.getByText("Deploy Model").click();
    await waitFor(() => {
      expect(screen.getByText("fraud-detector")).toBeDefined();
    });

    fireEvent.change(screen.getByDisplayValue("Select model..."), {
      target: { value: "fraud-detector" },
    });

    await waitFor(() => {
      expect(screen.getByText("v1.0.0 (production)")).toBeDefined();
    });

    fireEvent.change(screen.getByDisplayValue("Select version..."), {
      target: { value: "v1.0.0" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const payload = JSON.parse(
        (postCall?.[1] as RequestInit | undefined)?.body as string,
      );
      expect(payload).toEqual({
        model_name: "fraud-detector",
        model_version: "v1.0.0",
      });
    });
  });

  it("sends prediction request with JSON features", async () => {
    const fetchMock = mockApi([sampleDeployment]);

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    screen.getByText("Test").click();
    await waitFor(() => {
      expect(screen.getByText("Run Prediction")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Run Prediction" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes("/predict") &&
          (init as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
  });

  it("displays prediction results", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/models/") && !url.includes("/predict")) {
        return new Response(JSON.stringify(sampleModels), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/predict")) {
        return new Response(
          JSON.stringify({
            predictions: [{ prediction: 1, confidence: 0.87 }],
            latency_ms: 12.3,
            model: "fraud-detector:v1.0.0",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify([sampleDeployment]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    screen.getByText("Test").click();
    await waitFor(() => {
      expect(screen.getByText("Run Prediction")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Run Prediction" }));

    await waitFor(() => {
      expect(screen.getByText(/Results/)).toBeDefined();
    });
    expect(screen.getByText(/12\.3ms/)).toBeDefined();
    expect(screen.getByText(/Prediction:/)).toBeDefined();
    expect(screen.getByText(/confidence: 87\.0%/)).toBeDefined();
  });
});
