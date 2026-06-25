import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRuns, useCreateRun } from "../features/runs/hooks";
import type { RunStatus } from "../features/runs/types";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { PageHeader } from "../components/layout/PageHeader";

interface RunRow extends Record<string, unknown> {
  id: number;
  experiment_id: number;
  status: RunStatus;
  created_at: string;
}

export function RunsPage(): React.ReactElement {
  const navigate = useNavigate();
  const runsQuery = useRuns();
  const createRunMutation = useCreateRun();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [experimentId, setExperimentId] = useState("1");
  const [datasetPath, setDatasetPath] = useState("dataset.csv");
  const [targetColumn, setTargetColumn] = useState("target");
  const [featureColumns, setFeatureColumns] = useState("feature1,feature2");
  const [nEstimators, setNEstimators] = useState("100");
  const [maxDepth, setMaxDepth] = useState("");

  const runs = ((runsQuery.data ?? []) as unknown) as RunRow[];
  const isLoading = runsQuery.isLoading;
  const isError = runsQuery.isError;
  const error = runsQuery.error as Error | null;

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createRunMutation.mutate(
      {
        experiment_id: Number(experimentId),
        config: {
          dataset_path: datasetPath,
          target_column: targetColumn,
          feature_columns: featureColumns
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          n_estimators: Number(nEstimators),
          max_depth: maxDepth === "" ? null : Number(maxDepth),
        },
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      }
    );
  };

  const columns = [
    {
      key: "id" as const,
      label: "ID",
      render: (value: unknown) => (
        <span style={{ fontWeight: 600 }}>{value as number}</span>
      ),
    },
    {
      key: "experiment_id" as const,
      label: "Experiment",
    },
    {
      key: "status" as const,
      label: "Status",
      render: (value: unknown) => (
        <Badge variant={value as RunStatus}>{String(value)}</Badge>
      ),
    },
    {
      key: "created_at" as const,
      label: "Created",
      render: (value: unknown) => (
        <span>{
          typeof value === "string"
            ? new Date(value).toLocaleString()
            : String(value)
        }</span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <PageHeader
        title="Runs"
        description="Manage training runs and monitor status"
      >
        <Button
          onClick={() => setIsModalOpen(true)}
          disabled={createRunMutation.isPending}
        >
          New Run
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
            Failed to load runs: {error?.message}
          </div>
        )}
        {!isLoading && !isError && (
          <Table
            columns={columns}
            rows={runs}
            onRowClick={(row) => navigate(`/runs/${row.id}`)}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Training Run"
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
              label="Experiment ID"
              type="number"
              value={experimentId}
              onChange={(e) => setExperimentId(e.target.value)}
              required
            />
            <Input
              label="Dataset Path"
              value={datasetPath}
              onChange={(e) => setDatasetPath(e.target.value)}
              required
            />
            <Input
              label="Target Column"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              required
            />
            <Input
              label="Feature Columns (comma-separated)"
              value={featureColumns}
              onChange={(e) => setFeatureColumns(e.target.value)}
              required
            />
            <Input
              label="N Estimators"
              type="number"
              value={nEstimators}
              onChange={(e) => setNEstimators(e.target.value)}
            />
            <Input
              label="Max Depth (leave empty for unlimited)"
              type="number"
              value={maxDepth}
              onChange={(e) => setMaxDepth(e.target.value)}
            />
            {createRunMutation.isError && (
              <div style={{ color: "#dc2626", fontSize: "13px" }}>
                {(createRunMutation.error as Error)?.message}
              </div>
            )}
            <Button
              type="submit"
              disabled={createRunMutation.isPending}
              style={{ alignSelf: "flex-end" }}
            >
              {createRunMutation.isPending ? "Creating..." : "Create Run"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
