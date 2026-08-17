import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject, useDeleteProject } from "../features/projects/hooks";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { Table } from "../components/ui/Table";
import { PageHeader } from "../components/layout/PageHeader";

interface ProjectRow extends Record<string, unknown> {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  experiment_count: number;
}

export function ProjectsPage(): React.ReactElement {
  const navigate = useNavigate();
  const projectsQuery = useProjects();
  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const isLoading = projectsQuery.isLoading;
  const isError = projectsQuery.isError;
  const error = projectsQuery.error as Error | null;

  const rows: ProjectRow[] = (projectsQuery.data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    created_at: project.created_at,
    experiment_count: project.experiments.length,
  }));

  const openCreateModal = () => {
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createProjectMutation.mutate(
      {
        name,
        description: description === "" ? null : description,
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      }
    );
  };

  const handleDelete = (projectId: number) => {
    deleteProjectMutation.mutate(projectId);
  };

  const columns = [
    {
      key: "name" as const,
      label: "Name",
      render: (value: unknown) => (
        <span style={{ fontWeight: 600 }}>{value as string}</span>
      ),
    },
    {
      key: "description" as const,
      label: "Description",
      render: (value: unknown) => {
        const text = value as string | null;
        return <span>{text ?? "—"}</span>;
      },
    },
    {
      key: "experiment_count" as const,
      label: "Experiments",
      render: (value: unknown) => <span>{value as number}</span>,
    },
    {
      key: "created_at" as const,
      label: "Created",
      render: (value: unknown) => (
        <span>
          {typeof value === "string"
            ? new Date(value).toLocaleString()
            : String(value)}
        </span>
      ),
    },
    {
      key: "id" as const,
      label: "",
      render: (_value: unknown, row: ProjectRow) => (
        <Button
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.id);
          }}
          disabled={deleteProjectMutation.isPending}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <PageHeader title="Projects" description="Organize experiments into projects">
        <Button onClick={openCreateModal} disabled={createProjectMutation.isPending}>
          New Project
        </Button>
      </PageHeader>
      <div style={{ flex: 1, overflow: "auto", padding: "0 32px 32px" }}>
        {isLoading && (
          <div
            style={{ display: "flex", justifyContent: "center", padding: "48px" }}
          >
            <Spinner size="lg" />
          </div>
        )}
        {isError && (
          <div style={{ color: "#dc2626", padding: "16px 0" }}>
            Failed to load projects: {error?.message}
          </div>
        )}
        {!isLoading && !isError && (
          <Table
            columns={columns}
            rows={rows}
            onRowClick={(row) => navigate(`/projects/${row.id}`)}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Project"
      >
        <form onSubmit={handleCreate}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            } as React.CSSProperties}
          >
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {createProjectMutation.isError && (
              <div style={{ color: "#dc2626", fontSize: "13px" }}>
                {(createProjectMutation.error as Error)?.message}
              </div>
            )}
            <Button
              type="submit"
              disabled={createProjectMutation.isPending}
              style={{ alignSelf: "flex-end" }}
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
