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
import {
  ConfigForm,
  buildConfigFromSchema,
  seedConfigFromSchema,
} from "../components/ui/ConfigForm";
import type { JsonSchema } from "../components/ui/ConfigForm";
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

const DATA_SOURCE_DEFAULTS: Record<string, unknown> = {
  dataset_path: "backend/datasets/sample.csv",
  target_column: "target",
  feature_columns: "feature1, feature2",
};

const DEFAULT_CONFIG_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    dataset_path: { title: "Dataset Path", type: "string" },
    target_column: { title: "Target Column", type: "string" },
    feature_columns: {
      title: "Feature Columns",
      type: "array",
      items: { type: "string" },
    },
    n_estimators: { title: "N Estimators", type: "integer", default: 100 },
    max_depth: {
      title: "Max Depth",
      anyOf: [{ type: "integer" }, { type: "null" }],
      default: null,
    },
  },
  required: ["dataset_path", "target_column", "feature_columns"],
};

export function RunsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const runsQuery = useRuns();
  const createRunMutation = useCreateRun();
  const trainersQuery = useTrainers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [experimentId, setExperimentId] = useState("1");
  const [modelName, setModelName] = useState("random_forest");
  const [config, setConfig] = useState<Record<string, unknown>>({});

  const selectedTrainer = trainersQuery.data?.find(
    (trainer) => trainer.name === modelName
  );
  const configSchema = (selectedTrainer?.config_schema ??
    DEFAULT_CONFIG_SCHEMA) as unknown as JsonSchema;

  const resetConfigFor = (schema: JsonSchema) => {
    setConfig({ ...seedConfigFromSchema(schema), ...DATA_SOURCE_DEFAULTS });
  };

  const openCreateModal = () => {
    setIsModalOpen(true);
    resetConfigFor(configSchema);
  };

  const handleModelChange = (value: string) => {
    setModelName(value);
    const trainer = trainersQuery.data?.find((t) => t.name === value);
    const schema = (trainer?.config_schema ??
      DEFAULT_CONFIG_SCHEMA) as unknown as JsonSchema;
    resetConfigFor(schema);
  };

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
    const configPayload = buildConfigFromSchema(
      config,
      configSchema
    ) as unknown as RunConfig;
    createRunMutation.mutate(
      {
        experiment_id: Number(experimentId),
        trainer_name: modelName,
        config: configPayload,
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
          onClick={openCreateModal}
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
              onChange={(e) => handleModelChange(e.target.value)}
              options={modelOptions}
            />
            <Input
              label="Experiment ID"
              type="number"
              value={experimentId}
              onChange={(e) => setExperimentId(e.target.value)}
              required
            />
            <ConfigForm
              schema={configSchema}
              values={config}
              onChange={(key, value) =>
                setConfig((prev) => ({ ...prev, [key]: value }))
              }
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
