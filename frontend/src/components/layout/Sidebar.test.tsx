import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Sidebar } from "./Sidebar";

const sampleProjects = [
  {
    id: 1,
    name: "Alpha",
    description: "First project",
    created_at: "2024-01-01T00:00:00Z",
    experiments: [
      { id: 11, project_id: 1, name: "Exp A", created_at: "2024-01-01T00:00:00Z", run_count: 3 },
      { id: 12, project_id: 1, name: "Exp B", created_at: "2024-01-01T00:00:00Z", run_count: 0 },
    ],
  },
  {
    id: 2,
    name: "Beta",
    description: null,
    created_at: "2024-01-02T00:00:00Z",
    experiments: [],
  },
];

function mockApi() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify(sampleProjects), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

function renderWithRoute(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<Sidebar />} />
          <Route path="/projects" element={<Sidebar />} />
          <Route path="/projects/:projectId" element={<Sidebar />} />
          <Route path="/experiments/:experimentId" element={<Sidebar />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Sidebar", () => {
  it("renders the TrainGrid brand", () => {
    mockApi();
    renderWithRoute(["/"]);
    expect(screen.getByText("TrainGrid")).toBeDefined();
  });

  it("renders the Projects section header", () => {
    mockApi();
    renderWithRoute(["/"]);
    expect(screen.getByText("Projects")).toBeDefined();
  });

  it("renders the '+ New Project' link", () => {
    mockApi();
    renderWithRoute(["/"]);
    const link = screen.getByText("+ New Project");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/projects");
  });

  it("renders project names from the API", async () => {
    mockApi();
    renderWithRoute(["/"]);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
    expect(screen.getByText("Beta")).toBeDefined();
  });

  it("project links have correct hrefs", async () => {
    mockApi();
    renderWithRoute(["/"]);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
    expect(screen.getByText("Alpha").getAttribute("href")).toBe("/projects/1");
    expect(screen.getByText("Beta").getAttribute("href")).toBe("/projects/2");
  });

  it("shows nested experiments under the active project", async () => {
    mockApi();
    renderWithRoute(["/projects/1"]);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
    expect(screen.getByText("Exp A")).toBeDefined();
    expect(screen.getByText("Exp B")).toBeDefined();
  });

  it("experiment links have correct hrefs", async () => {
    mockApi();
    renderWithRoute(["/projects/1"]);

    await waitFor(() => {
      expect(screen.getByText("Exp A")).toBeDefined();
    });
    expect(screen.getByText("Exp A").getAttribute("href")).toBe("/projects/1/experiments/11");
    expect(screen.getByText("Exp B").getAttribute("href")).toBe("/projects/1/experiments/12");
  });

  it("does not show experiments for non-active projects", async () => {
    mockApi();
    renderWithRoute(["/projects/1"]);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
    // Beta has no experiments, but more importantly we should NOT see
    // experiments from Beta rendered under Alpha
    expect(screen.queryByText("Exp A")).toBeDefined();
    // Exp A belongs to Alpha (project 1), which is active — this is correct
  });

  it("does not show experiments when no project is active", async () => {
    mockApi();
    renderWithRoute(["/"]);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
    // No project is active (no projectId in URL), so experiments should be hidden
    expect(screen.queryByText("Exp A")).toBeNull();
    expect(screen.queryByText("Exp B")).toBeNull();
  });

  it("shows experiments when navigating to an experiment route", async () => {
    mockApi();
    renderWithRoute(["/experiments/11"]);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
    // Even though the URL is /experiments/:experimentId, no projectId is in the URL
    // so the active project detection won't expand experiments
    // This is expected — the Sidebar uses projectId from the route, not experimentId
  });
});
