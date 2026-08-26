import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useProject,
  useDeleteProject,
} from "../features/projects/hooks";
import {
  useCreateExperiment,
  useDeleteExperiment,
} from "../features/experiments/hooks";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { Table } from "../components/ui/Table";
import { PageHeader } from "../components/layout/PageHeader";

interface ExperimentRow extends Record<string, unknown> {
  id: number;
  name: string;
  run_count: number;
  created_at: string;
}

export function ProjectDetailPage(): React.ReactElement {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const projectQuery = useProject(id);
  const deleteProjectMutation = useDeleteProject();
  const createExperimentMutation = useCreateExperiment();
  const deleteExperimentMutation = useDeleteExperiment();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");

  const isLoading = projectQuery.isLoading;
  const isError = projectQuery.isError;
  const error = projectQuery.error as Error | null;

  const project = projectQuery.data ?? null;

  const rows: ExperimentRow[] = (project?.experiments ?? []).map(
    (experiment) => ({
      id: experiment.id,
      name: experiment.name,
      run_count: experiment.run_count,
      created_at: experiment.created_at,
    })
  );

  const openCreateModal = () => {
    setName("");
    setIsModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createExperimentMutation.mutate(
      { project_id: id, name },
      {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      }
    );
  };

  const handleDeleteExperiment = (experimentId: number) => {
    deleteExperimentMutation.mutate({ id: experimentId, projectId: id });
  };

  const handleDeleteProject = () => {
    deleteProjectMutation.mutate(id, {
      onSuccess: () => {
        navigate("/projects");
      },
    });
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
      key: "run_count" as const,
      label: "Runs",
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
      render: (_value: unknown, row: ExperimentRow) => (
        <Button
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteExperiment(row.id);
          }}
          disabled={deleteExperimentMutation.isPending}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <PageHeader
        title={project?.name ?? "Project"}
        description={project?.description ?? "Experiments organized under this project"}
      >
        <Button
          variant="secondary"
          onClick={() => navigate("/projects")}
        >
          Back to Projects
        </Button>
        <Button onClick={openCreateModal} disabled={createExperimentMutation.isPending}>
          New Experiment
        </Button>
        <Button
          variant="danger"
          onClick={handleDeleteProject}
          disabled={deleteProjectMutation.isPending}
        >
          Delete Project
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
            Failed to load project: {error?.message}
          </div>
        )}
        {!isLoading && !isError && (
          <Table
            columns={columns}
            rows={rows}
            onRowClick={(row) => navigate(`/projects/${id}/experiments/${row.id}`)}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Experiment"
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
            {createExperimentMutation.isError && (
              <div style={{ color: "#dc2626", fontSize: "13px" }}>
                {(createExperimentMutation.error as Error)?.message}
              </div>
            )}
            <Button
              type="submit"
              disabled={createExperimentMutation.isPending}
              style={{ alignSelf: "flex-end" }}
            >
              {createExperimentMutation.isPending ? "Creating..." : "Create Experiment"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
