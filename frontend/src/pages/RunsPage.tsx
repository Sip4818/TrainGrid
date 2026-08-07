import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRuns, useCreateRun } from "../features/runs/hooks";
import { useTrainers } from "../features/models/hooks";
import { RunStatus } from "../features/runs/types";
import type { RunConfig } from "../features/runs/types";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { Select } from "../components/ui/Select";
import { PageHeader } from "../components/layout/PageHeader";

interface RunRow extends Record<string, unknown> {
  id: number;
  experiment_id: number;
  status: RunStatus;
  created_at: string;
}

const DEFAULT_MODEL_OPTIONS = [
  { value: "random_forest", label: "Random Forest Classifier" },
  { value: "xgboost", label: "XGBoost Classifier" },
];

export function RunsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const runsQuery = useRuns();
  const createRunMutation = useCreateRun();
  const trainersQuery = useTrainers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [experimentId, setExperimentId] = useState("1");
  const [datasetPath, setDatasetPath] = useState("backend/datasets/sample.csv");
  const [targetColumn, setTargetColumn] = useState("target");
  const [featureColumns, setFeatureColumns] = useState("feature1,feature2");
  const [modelName, setModelName] = useState("random_forest");
  const [nEstimators, setNEstimators] = useState("100");
  const [maxDepth, setMaxDepth] = useState("");
  const [learningRate, setLearningRate] = useState("");

  const runs = ((runsQuery.data ?? []) as unknown) as RunRow[];
  const isLoading = runsQuery.isLoading;
  const isError = runsQuery.isError;
  const error = runsQuery.error as Error | null;

  const rawStatus = searchParams.get("status");
  const activeStatus = Object.values(RunStatus).includes(rawStatus as RunStatus)
    ? (rawStatus as RunStatus)
    : null;

  const filteredRuns = activeStatus
    ? runs.filter((run) => run.status === activeStatus)
    : runs;

  const statusFilterOptions = [
    { value: "", label: "All Statuses" },
    { value: RunStatus.PENDING, label: "Pending" },
    { value: RunStatus.RUNNING, label: "Running" },
    { value: RunStatus.COMPLETED, label: "Completed" },
    { value: RunStatus.FAILED, label: "Failed" },
    { value: RunStatus.CANCELLED, label: "Cancelled" },
  ];

  const modelOptions =
    trainersQuery.data && trainersQuery.data.length > 0
      ? trainersQuery.data.map((trainer) => ({
          value: trainer.name,
          label: trainer.label,
        }))
      : DEFAULT_MODEL_OPTIONS;

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", value);
    }
    setSearchParams(searchParams);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const config: RunConfig = {
      dataset_path: datasetPath,
      target_column: targetColumn,
      feature_columns: featureColumns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      n_estimators: Number(nEstimators),
    };
    if (maxDepth !== "") {
      config.max_depth = Number(maxDepth);
    }
    if (modelName === "xgboost" && learningRate !== "") {
      config.learning_rate = Number(learningRate);
    }
    createRunMutation.mutate(
      {
        experiment_id: Number(experimentId),
        trainer_name: modelName,
        config,
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
        <Select
          aria-label="Filter by status"
          value={activeStatus ?? ""}
          onChange={handleStatusFilterChange}
          options={statusFilterOptions}
        />
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
            rows={filteredRuns}
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
            <Select
              label="Model"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              options={modelOptions}
            />
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
            {modelName === "xgboost" && (
              <Input
                label="Learning Rate"
                type="number"
                step="0.01"
                value={learningRate}
                onChange={(e) => setLearningRate(e.target.value)}
              />
            )}
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
