import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";
import { ProjectDetailPage } from "./ProjectDetailPage";

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

function mockApi(project: unknown = sampleProject) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async (_input, init) => {
      const method = (init?.method as string | undefined) ?? "GET";
      if (method === "POST") {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (method === "DELETE") {
        return new Response(JSON.stringify({ detail: "deleted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(project), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects/1"]}>
        <Routes>
          <Route path="/projects/:projectId" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  navigateMock.mockClear();
});

describe("ProjectDetailPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>,
    );

    renderWithProviders(<ProjectDetailPage />);

    expect(screen.getByRole("status")).toBeDefined();
  });

  it("renders the project header and its experiments", async () => {
    mockApi();

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Exp A")).toBeDefined();
    });
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("First project")).toBeDefined();
    expect(screen.getByText("Exp B")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load project: Network error"),
      ).toBeDefined();
    });
  });

  it("shows an empty table when the project has no experiments", async () => {
    mockApi({ ...sampleProject, experiments: [] });

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("No data")).toBeDefined();
    });
  });

  it("opens the create experiment modal on button click", async () => {
    mockApi();

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => screen.getByText("New Experiment"));
    screen.getByText("New Experiment").click();
    await waitFor(() =>
      screen.getByRole("heading", { name: "Create Experiment" }),
    );
  });

  it("creates an experiment scoped to the project", async () => {
    const fetchMock = mockApi();

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => screen.getByText("New Experiment"));
    screen.getByText("New Experiment").click();
    await waitFor(() =>
      screen.getByRole("heading", { name: "Create Experiment" }),
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Exp C" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create Experiment" }),
    );

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const payload = JSON.parse(
        (postCall?.[1] as RequestInit | undefined)?.body as string,
      );
      expect(payload).toEqual({ project_id: 1, name: "Exp C" });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Create Experiment" }),
      ).toBeNull();
    });
  });

  it("deletes an experiment via the row delete button", async () => {
    const fetchMock = mockApi();

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Exp A")).toBeDefined();
    });

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes("/experiments/11") &&
          (init as RequestInit | undefined)?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
    });
  });

  it("navigates to the scoped runs page on experiment row click", async () => {
    mockApi();

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Exp A")).toBeDefined();
    });

    screen.getByText("Exp A").click();

    expect(navigateMock).toHaveBeenCalledWith("/projects/1/experiments/11");
  });

  it("navigates back to projects via the back button", async () => {
    mockApi();

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => screen.getByText("Back to Projects"));
    screen.getByText("Back to Projects").click();

    expect(navigateMock).toHaveBeenCalledWith("/projects");
  });

  it("deletes the project and navigates back to projects", async () => {
    mockApi();

    renderWithProviders(<ProjectDetailPage />);

    await waitFor(() => screen.getByText("Delete Project"));
    screen.getByText("Delete Project").click();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/projects");
    });
  });
});