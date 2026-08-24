import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Breadcrumbs } from "./Breadcrumbs";

const sampleProject = {
  id: 1,
  name: "Alpha",
  description: "First project",
  created_at: "2024-01-01T00:00:00Z",
  experiments: [
    { id: 11, project_id: 1, name: "Exp A", created_at: "2024-01-01T00:00:00Z", run_count: 3 },
    { id: 12, project_id: 1, name: "Exp B", created_at: "2024-01-01T00:00:00Z", run_count: 0 },
  ],
};

function mockApi() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify(sampleProject), {
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
          <Route path="/projects" element={<Breadcrumbs />} />
          <Route path="/projects/:projectId" element={<Breadcrumbs />} />
          <Route path="/projects/:projectId/experiments/:experimentId" element={<Breadcrumbs />} />
          <Route path="/projects/:projectId/experiments/:experimentId/runs/:runId" element={<Breadcrumbs />} />
          <Route path="/projects/:projectId/experiments/:experimentId/compare" element={<Breadcrumbs />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Breadcrumbs", () => {
  it("renders 'Projects' link on /projects", () => {
    mockApi();
    renderWithRoute(["/projects"]);

    expect(screen.getByText("Projects")).toBeDefined();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
  });

  it("renders project name on /projects/1", async () => {
    mockApi();
    renderWithRoute(["/projects/1"]);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
    expect(screen.getByText("Projects")).toBeDefined();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute("href", "/projects/1");
  });

  it("shows numeric fallback while project loads", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>,
    );
    renderWithRoute(["/projects/99"]);

    expect(screen.getByText("99")).toBeDefined();
  });

  it("renders experiment name on /projects/1/experiments/11", async () => {
    mockApi();
    renderWithRoute(["/projects/1/experiments/11"]);

    await waitFor(() => {
      expect(screen.getByText("Exp A")).toBeDefined();
    });
    expect(screen.getByText("Projects")).toBeDefined();
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByRole("link", { name: "Exp A" })).toHaveAttribute(
      "href",
      "/projects/1/experiments/11",
    );
  });

  it("renders run ID on /projects/1/experiments/11/runs/5", async () => {
    mockApi();
    renderWithRoute(["/projects/1/experiments/11/runs/5"]);

    await waitFor(() => {
      expect(screen.getByText("Exp A")).toBeDefined();
    });
    expect(screen.getByText("Run #5")).toBeDefined();
    expect(screen.getByText("Projects")).toBeDefined();
    expect(screen.getByText("Alpha")).toBeDefined();
  });

  it("renders 'Compare' on /projects/1/experiments/11/compare", async () => {
    mockApi();
    renderWithRoute(["/projects/1/experiments/11/compare"]);

    await waitFor(() => {
      expect(screen.getByText("Exp A")).toBeDefined();
    });
    expect(screen.getByText("Compare")).toBeDefined();
    expect(screen.getByText("Projects")).toBeDefined();
    expect(screen.getByText("Alpha")).toBeDefined();
  });

  it("shows separator slashes between crumbs", async () => {
    mockApi();
    renderWithRoute(["/projects/1/experiments/11"]);

    await waitFor(() => {
      expect(screen.getByText("Exp A")).toBeDefined();
    });
    const separators = screen.getAllByText("/");
    expect(separators.length).toBeGreaterThanOrEqual(2);
  });

  it("last crumb without a to prop is not a link", async () => {
    mockApi();
    renderWithRoute(["/projects/1/experiments/11/runs/5"]);

    await waitFor(() => {
      expect(screen.getByText("Run #5")).toBeDefined();
    });
    const runSpan = screen.getByText("Run #5");
    expect(runSpan.tagName).not.toBe("A");
  });
});
