import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ProjectsPage } from "./ProjectsPage";

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

function mockApi(projects: unknown[] = []) {
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
      return new Response(JSON.stringify(projects), {
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
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  navigateMock.mockClear();
});

describe("ProjectsPage", () => {
  it("renders loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>,
    );

    renderWithProviders(<ProjectsPage />);

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText("Projects")).toBeDefined();
  });

  it("renders projects table after load", async () => {
    mockApi(sampleProjects);

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("First project")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load projects: Network error"),
      ).toBeDefined();
    });
  });

  it("shows an empty table when there are no projects", async () => {
    mockApi([]);

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText("No data")).toBeDefined();
    });
  });

  it("opens the create project modal on button click", async () => {
    mockApi(sampleProjects);

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => screen.getByText("New Project"));
    screen.getByText("New Project").click();
    await waitFor(() =>
      screen.getByRole("heading", { name: "Create Project" }),
    );
  });

  it("creates a project with the modal payload", async () => {
    const fetchMock = mockApi(sampleProjects);

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => screen.getByText("New Project"));
    screen.getByText("New Project").click();
    await waitFor(() =>
      screen.getByRole("heading", { name: "Create Project" }),
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Gamma" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Third project" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create Project" }),
    );

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const payload = JSON.parse(
        (postCall?.[1] as RequestInit | undefined)?.body as string,
      );
      expect(payload).toEqual({
        name: "Gamma",
        description: "Third project",
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Create Project" }),
      ).toBeNull();
    });
  });

  it("deletes a project via the row delete button", async () => {
    const fetchMock = mockApi(sampleProjects);

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes("/projects/1") &&
          (init as RequestInit | undefined)?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
    });
  });

  it("does not navigate when the delete button is clicked", async () => {
    mockApi(sampleProjects);

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]!);

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("navigates to project detail on row click", async () => {
    mockApi(sampleProjects);

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });

    screen.getByText("Alpha").click();

    expect(navigateMock).toHaveBeenCalledWith("/projects/1");
  });
});