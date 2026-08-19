import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRuns, useCreateRun } from "../features/runs/hooks";
import { useTrainers } from "../features/models/hooks";
import { useDatasets, useUploadDataset } from "../features/datasets/hooks";
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

const DATA_SOURCE_DEFAULTS: Record<string, unknown> = {
  dataset_path: "backend/datasets/sample.csv",
  target_column: "target",
  feature_columns: "feature1, feature2",
};

/** Maximum number of runs that can be selected for comparison. */
const MAX_COMPARE = 3;

export function RunsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const runsQuery = useRuns();
  const createRunMutation = useCreateRun();
  const trainersQuery = useTrainers();
  const datasetsQuery = useDatasets();
  const uploadDatasetMutation = useUploadDataset();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [experimentId, setExperimentId] = useState("1");
  const [modelName, setModelName] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);

  const selectedTrainer =
    trainersQuery.data?.find((trainer) => trainer.name === modelName) ?? null;
  const configSchema = selectedTrainer
    ? (selectedTrainer.config_schema as unknown as JsonSchema)
    : null;

  const resetConfigFor = (schema: JsonSchema) => {
    const seeded = seedConfigFromSchema(schema);
    const properties = schema.properties ?? {};
    for (const [key, value] of Object.entries(DATA_SOURCE_DEFAULTS)) {
      if (key in properties) {
        seeded[key] = value;
      }
    }
    setConfig(seeded);
  };

  const handleModelChange = (value: string) => {
    setModelName(value);
    const trainer = trainersQuery.data?.find((t) => t.name === value);
    if (trainer) {
      resetConfigFor(trainer.config_schema);
    } else {
      setConfig({});
    }
  };

  const openCreateModal = () => {
    const urlExperimentId = searchParams.get("experiment_id");
    if (urlExperimentId !== null) {
      setExperimentId(urlExperimentId);
    }
    setIsModalOpen(true);
    const trainers = trainersQuery.data ?? [];
    const current = trainers.find((t) => t.name === modelName);
    if (current) {
      resetConfigFor(current.config_schema);
    } else if (trainers.length > 0 && trainers[0]) {
      handleModelChange(trainers[0].name);
    } else {
      setConfig({});
    }
  };

  const runs = ((runsQuery.data ?? []) as unknown) as RunRow[];
  const isLoading = runsQuery.isLoading;
  const isError = runsQuery.isError;
  const error = runsQuery.error as Error | null;

  const rawStatus = searchParams.get("status");
  const activeStatus = Object.values(RunStatus).includes(rawStatus as RunStatus)
    ? (rawStatus as RunStatus)
    : null;

  const rawExperimentId = searchParams.get("experiment_id");
  const activeExperimentId =
    rawExperimentId !== null && /^\d+$/.test(rawExperimentId)
      ? Number(rawExperimentId)
      : null;

  const filteredRuns = runs.filter((run) => {
    if (activeStatus && run.status !== activeStatus) return false;
    if (
      activeExperimentId !== null &&
      run.experiment_id !== activeExperimentId
    ) {
      return false;
    }
    return true;
  });

  const statusFilterOptions = [
    { value: "", label: "All Statuses" },
    { value: RunStatus.PENDING, label: "Pending" },
    { value: RunStatus.RUNNING, label: "Running" },
    { value: RunStatus.COMPLETED, label: "Completed" },
    { value: RunStatus.FAILED, label: "Failed" },
    { value: RunStatus.CANCELLED, label: "Cancelled" },
  ];

  const modelOptions = (trainersQuery.data ?? []).map((trainer) => ({
    value: trainer.name,
    label: trainer.label,
  }));

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", value);
    }
    setSearchParams(searchParams);
  };

  const selectedExperimentId =
    selectedIds.length > 0
      ? (runs.find((run) => run.id === selectedIds[0])?.experiment_id ?? null)
      : null;

  const toggleSelect = (row: RunRow) => {
    if (selectedIds.includes(row.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== row.id));
      setSelectionHint(null);
      return;
    }
    if (selectedIds.length >= MAX_COMPARE) {
      setSelectionHint(`Select up to ${MAX_COMPARE} runs to compare.`);
      return;
    }
    if (
      selectedExperimentId !== null &&
      row.experiment_id !== selectedExperimentId
    ) {
      setSelectionHint("Runs must belong to the same experiment to compare.");
      return;
    }
    setSelectionHint(null);
    setSelectedIds([...selectedIds, row.id]);
  };

  const handleCompare = () => {
    if (selectedIds.length < 2 || selectedExperimentId === null) return;
    const ids = selectedIds.map((id) => `run_ids=${id}`).join("&");
    navigate(`/runs/compare?experiment_id=${selectedExperimentId}&${ids}`);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTrainer || !configSchema) return;
    const configPayload = buildConfigFromSchema(
      config,
      configSchema
    ) as unknown as RunConfig;
    createRunMutation.mutate(
      {
        experiment_id: Number(experimentId),
        trainer_name: selectedTrainer.name,
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
      key: "selected" as const,
      label: "Compare",
      render: (_value: unknown, row: RunRow) => (
        <input
          type="checkbox"
          aria-label={`Compare run ${String(row.id)}`}
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelect(row)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
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
        <Button onClick={handleCompare} disabled={selectedIds.length < 2}>
          Compare ({selectedIds.length})
        </Button>
        <Button
          onClick={openCreateModal}
          disabled={createRunMutation.isPending}
        >
          New Run
        </Button>
      </PageHeader>
      <div style={{ flex: 1, overflow: "auto", padding: "0 32px 32px" }}>
        {selectionHint && (
          <div style={{ color: "#b45309", fontSize: "13px", padding: "12px 0" }}>
            {selectionHint}
          </div>
        )}
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
            {trainersQuery.isLoading && (
              <div style={{ color: "#6b7280", fontSize: "13px" }}>
                Loading models...
              </div>
            )}
            {trainersQuery.isError && (
              <div style={{ color: "#dc2626", fontSize: "13px" }}>
                Couldn't load models:{" "}
                {(trainersQuery.error as Error | null)?.message}
              </div>
            )}
            {!trainersQuery.isLoading &&
              !trainersQuery.isError &&
              configSchema && (
                <ConfigForm
                  schema={configSchema}
                  values={config}
                  onChange={(key, value) =>
                    setConfig((prev) => ({ ...prev, [key]: value }))
                  }
                  datasets={(datasetsQuery.data ?? []).map((dataset) => ({
                    store_key: dataset.store_key,
                    name: dataset.name,
                  }))}
                  onUploadDataset={(file) =>
                    uploadDatasetMutation.mutate(
                      { file, name: file.name },
                      {
                        onSuccess: (dataset) => {
                          setConfig((prev) => ({
                            ...prev,
                            dataset_path: dataset.store_key,
                          }));
                        },
                      },
                    )
                  }
                  isUploading={uploadDatasetMutation.isPending}
                />
              )}
            {createRunMutation.isError && (
              <div style={{ color: "#dc2626", fontSize: "13px" }}>
                {(createRunMutation.error as Error)?.message}
              </div>
            )}
            <Button
              type="submit"
              disabled={createRunMutation.isPending || !selectedTrainer}
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
