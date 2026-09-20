import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRuns, useCreateRun } from "../features/runs/hooks";
import { useExperiment } from "../features/experiments/hooks";
import { useTrainers } from "../features/models/hooks";
import { useDatasets, useUploadDataset } from "../features/datasets/hooks";
import { useSweeps, useCreateSweep } from "../features/sweeps/hooks";
import type { Sweep, SweepCreate } from "../features/sweeps/types";
import { SearchStrategy, SweepGoal, SweepStatus } from "../features/sweeps/types";
import {
  SearchSpaceEditor,
  buildSearchSpace,
} from "../features/sweeps/components/SearchSpaceEditor";
import { SweepDetail } from "../features/sweeps/components/SweepDetail";
import { RunStatus } from "../features/runs/types";
import type { RunConfig } from "../features/runs/types";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Table } from "../components/ui/Table";
import { Tabs } from "../components/ui/Tabs";
import { Modal } from "../components/ui/Modal";
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
  status: RunStatus;
  created_at: string;
}

interface SweepRow extends Record<string, unknown> {
  id: number;
  trainer_name: string;
  strategy: string;
  status: SweepStatus;
  created_at: string;
  runCount: number;
  bestRunId: number | null;
}

const DATA_SOURCE_DEFAULTS: Record<string, unknown> = {
  target_column: "target",
  feature_columns: "feature1, feature2",
};

/** Maximum number of runs that can be selected for comparison. */
const MAX_COMPARE = 3;

export function ExperimentPage(): React.ReactElement {
  const navigate = useNavigate();
  const { projectId, experimentId } = useParams<{
    projectId: string;
    experimentId: string;
  }>();
  const pid = Number(projectId);
  const eid = Number(experimentId);
  const [searchParams, setSearchParams] = useSearchParams();
  const runsQuery = useRuns(pid, eid);
  const experimentQuery = useExperiment(eid, pid);
  const createRunMutation = useCreateRun();
  const trainersQuery = useTrainers();
  const datasetsQuery = useDatasets();
  const uploadDatasetMutation = useUploadDataset();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modelName, setModelName] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);

  // --- Sweeps tab state ---
  const [activeTab, setActiveTab] = useState("runs");
  const sweepsQuery = useSweeps(pid, eid);
  const createSweepMutation = useCreateSweep();
  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
  const [sweepTrainer, setSweepTrainer] = useState("");
  const [sweepDatasetPath, setSweepDatasetPath] = useState("");
  const [sweepTargetColumn, setSweepTargetColumn] = useState("target");
  const [sweepFeatureColumns, setSweepFeatureColumns] = useState(
    "feature1, feature2",
  );
  const [searchSpaceText, setSearchSpaceText] = useState<Record<string, string>>(
    {},
  );
  const [sweepStrategy, setSweepStrategy] = useState<SearchStrategy>(
    SearchStrategy.GRID,
  );
  const [sweepMaxCombinations, setSweepMaxCombinations] = useState("");
  const [sweepMetric, setSweepMetric] = useState("accuracy");
  const [sweepGoal, setSweepGoal] = useState<SweepGoal>(SweepGoal.MAXIMIZE);
  const [sweepSubmitAttempted, setSweepSubmitAttempted] = useState(false);
  const [selectedSweepId, setSelectedSweepId] = useState<number | null>(null);

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

  const filteredRuns = runs.filter((run) => {
    if (activeStatus && run.status !== activeStatus) return false;
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
    setSelectionHint(null);
    setSelectedIds([...selectedIds, row.id]);
  };

  const handleCompare = () => {
    if (selectedIds.length < 2) return;
    const ids = selectedIds.map((id) => `run_ids=${id}`).join("&");
    navigate(
      `/projects/${pid}/experiments/${eid}/compare?${ids}`,
    );
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
        project_id: pid,
        experiment_id: eid,
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

  const sweepTrainerInfo =
    trainersQuery.data?.find((trainer) => trainer.name === sweepTrainer) ??
    null;
  const sweepSchema = sweepTrainerInfo
    ? (sweepTrainerInfo.config_schema as unknown as JsonSchema)
    : null;

  const seedSearchSpace = (schema: JsonSchema) => {
    const seeded: Record<string, string> = {};
    for (const [name, prop] of Object.entries(schema.properties ?? {})) {
      if (
        name === "dataset_path" ||
        name === "target_column" ||
        name === "feature_columns" ||
        name === "trainer_name"
      ) {
        continue;
      }
      const def = (prop as { default?: unknown }).default;
      if (def === undefined || def === null) continue;
      seeded[name] = Array.isArray(def) ? JSON.stringify(def) : String(def);
    }
    setSearchSpaceText(seeded);
  };

  const handleSweepTrainerChange = (value: string) => {
    setSweepTrainer(value);
    const trainer = trainersQuery.data?.find((t) => t.name === value);
    if (trainer) {
      seedSearchSpace(trainer.config_schema as unknown as JsonSchema);
    } else {
      setSearchSpaceText({});
    }
  };

  const openSweepModal = () => {
    setSweepSubmitAttempted(false);
    setIsSweepModalOpen(true);
    const trainers = trainersQuery.data ?? [];
    const current = trainers.find((t) => t.name === sweepTrainer);
    if (current) {
      seedSearchSpace(current.config_schema as unknown as JsonSchema);
    } else if (trainers.length > 0 && trainers[0]) {
      handleSweepTrainerChange(trainers[0].name);
    } else {
      setSearchSpaceText({});
    }
  };

  const handleSweepCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSweepSubmitAttempted(true);
    if (!sweepTrainerInfo || !sweepSchema) return;
    const searchSpace = buildSearchSpace(searchSpaceText, sweepSchema);
    if (!searchSpace) return;
    const featureColumns = sweepFeatureColumns
      .split(",")
      .map((col) => col.trim())
      .filter(Boolean);
    if (
      sweepDatasetPath === "" ||
      sweepTargetColumn.trim() === "" ||
      featureColumns.length === 0
    ) {
      return;
    }
    const payload: SweepCreate = {
      project_id: pid,
      experiment_id: eid,
      trainer_name: sweepTrainerInfo.name,
      dataset_path: sweepDatasetPath,
      target_column: sweepTargetColumn.trim(),
      feature_columns: featureColumns,
      search_space: searchSpace,
      strategy: sweepStrategy,
      metric: sweepMetric.trim() === "" ? "accuracy" : sweepMetric.trim(),
      goal: sweepGoal,
    };
    if (sweepStrategy === SearchStrategy.RANDOM) {
      const maxCombos = Number(sweepMaxCombinations);
      if (!Number.isInteger(maxCombos) || maxCombos < 1) return;
      payload.max_combinations = maxCombos;
    }
    createSweepMutation.mutate(payload, {
      onSuccess: () => {
        setIsSweepModalOpen(false);
        setSweepSubmitAttempted(false);
      },
    });
  };

  const sweeps = ((sweepsQuery.data ?? []) as unknown) as Sweep[];
  const selectedSweep =
    sweeps.find((sweep) => sweep.id === selectedSweepId) ?? null;
  const sweepChildRuns = selectedSweep
    ? (runsQuery.data ?? []).filter((run) =>
        (selectedSweep.run_ids ?? []).includes(run.id),
      )
    : [];

  const sweepRows: SweepRow[] = sweeps.map((sweep) => ({
    id: sweep.id,
    trainer_name: sweep.trainer_name,
    strategy: sweep.strategy,
    status: sweep.status,
    created_at: sweep.created_at,
    runCount: (sweep.run_ids ?? []).length,
    bestRunId: sweep.best_run_id,
  }));

  const sweepColumns = [
    {
      key: "id" as const,
      label: "ID",
      render: (value: unknown) => (
        <span style={{ fontWeight: 600 }}>{value as number}</span>
      ),
    },
    {
      key: "trainer_name" as const,
      label: "Trainer",
      render: (value: unknown) => <span>{value as string}</span>,
    },
    {
      key: "strategy" as const,
      label: "Strategy",
      render: (value: unknown) => <span>{value as string}</span>,
    },
    {
      key: "status" as const,
      label: "Status",
      render: (value: unknown) => (
        <Badge variant={value as SweepStatus}>{String(value)}</Badge>
      ),
    },
    {
      key: "runCount" as const,
      label: "Runs",
      render: (value: unknown) => <span>{value as number}</span>,
    },
    {
      key: "bestRunId" as const,
      label: "Best Run",
      render: (value: unknown) =>
        value === null || value === undefined ? (
          <span>—</span>
        ) : (
          <span style={{ fontWeight: 600 }}>#{value as number}</span>
        ),
    },
  ];

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
        title={experimentQuery.data?.name ?? "Experiment"}
        description="Training runs and sweeps in this experiment"
      >
        <Button
          variant="secondary"
          onClick={() => navigate(`/projects/${pid}`)}
        >
          Back to Project
        </Button>
        {activeTab === "runs" ? (
          <>
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
          </>
        ) : (
          <Button
            onClick={openSweepModal}
            disabled={createSweepMutation.isPending}
          >
            New Sweep
          </Button>
        )}
      </PageHeader>
      <div style={{ flex: 1, overflow: "auto", padding: "0 32px 32px" }}>
        <Tabs
          tabs={[
            { id: "runs", label: "Runs" },
            { id: "sweeps", label: "Sweeps" },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId);
            setSelectedSweepId(null);
          }}
        >
          <div>
            {activeTab === "runs" ? (
              <>
                {selectionHint && (
                  <div
                    style={{
                      color: "#b45309",
                      fontSize: "13px",
                      padding: "12px 0",
                    }}
                  >
                    {selectionHint}
                  </div>
                )}
                {isLoading && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "48px",
                    }}
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
                    onRowClick={(row) =>
                      navigate(
                        `/projects/${pid}/experiments/${eid}/runs/${row.id}`,
                      )
                    }
                  />
                )}
              </>
            ) : selectedSweep ? (
              <SweepDetail
                sweep={selectedSweep}
                childRuns={sweepChildRuns}
                onBack={() => setSelectedSweepId(null)}
                onSelectRun={(runId) =>
                  navigate(
                    `/projects/${pid}/experiments/${eid}/runs/${runId}`,
                  )
                }
              />
            ) : (
              <>
                {sweepsQuery.isLoading && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "48px",
                    }}
                  >
                    <Spinner size="lg" />
                  </div>
                )}
                {sweepsQuery.isError && (
                  <div style={{ color: "#dc2626", padding: "16px 0" }}>
                    Failed to load sweeps:{" "}
                    {(sweepsQuery.error as Error | null)?.message}
                  </div>
                )}
                {!sweepsQuery.isLoading && !sweepsQuery.isError && (
                  <Table
                    columns={sweepColumns}
                    rows={sweepRows}
                    onRowClick={(row) => setSelectedSweepId(row.id as number)}
                  />
                )}
              </>
            )}
          </div>
        </Tabs>
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

      <Modal
        isOpen={isSweepModalOpen}
        onClose={() => setIsSweepModalOpen(false)}
        title="Create Hyperparameter Sweep"
      >
        <form onSubmit={handleSweepCreate}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            } as React.CSSProperties}
          >
            <Select
              label="Model"
              value={sweepTrainer}
              onChange={(e) => handleSweepTrainerChange(e.target.value)}
              options={modelOptions}
            />
            <Select
              label="Dataset"
              value={sweepDatasetPath}
              onChange={(e) => setSweepDatasetPath(e.target.value)}
              options={[
                { value: "", label: "Select a dataset…" },
                ...(datasetsQuery.data ?? []).map((dataset) => ({
                  value: dataset.store_key,
                  label: dataset.name,
                })),
              ]}
            />
            <Input
              label="Target Column"
              value={sweepTargetColumn}
              onChange={(e) => setSweepTargetColumn(e.target.value)}
            />
            <Input
              label="Feature Columns"
              placeholder="comma-separated values"
              value={sweepFeatureColumns}
              onChange={(e) => setSweepFeatureColumns(e.target.value)}
            />
            {!trainersQuery.isLoading && !trainersQuery.isError && sweepSchema && (
              <SearchSpaceEditor
                schema={sweepSchema}
                values={searchSpaceText}
                onChange={(key, value) =>
                  setSearchSpaceText((prev) => ({ ...prev, [key]: value }))
                }
                showAllErrors={sweepSubmitAttempted}
              />
            )}
            <Select
              label="Strategy"
              value={sweepStrategy}
              onChange={(e) =>
                setSweepStrategy(e.target.value as SearchStrategy)
              }
              options={[
                { value: SearchStrategy.GRID, label: "Grid search" },
                { value: SearchStrategy.RANDOM, label: "Random search" },
              ]}
            />
            {sweepStrategy === SearchStrategy.RANDOM && (
              <Input
                label="Max Combinations"
                type="number"
                step="1"
                value={sweepMaxCombinations}
                onChange={(e) => setSweepMaxCombinations(e.target.value)}
              />
            )}
            <Input
              label="Metric"
              value={sweepMetric}
              onChange={(e) => setSweepMetric(e.target.value)}
            />
            <Select
              label="Goal"
              value={sweepGoal}
              onChange={(e) => setSweepGoal(e.target.value as SweepGoal)}
              options={[
                { value: SweepGoal.MAXIMIZE, label: "Maximize" },
                { value: SweepGoal.MINIMIZE, label: "Minimize" },
              ]}
            />
            {createSweepMutation.isError && (
              <div style={{ color: "#dc2626", fontSize: "13px" }}>
                {(createSweepMutation.error as Error)?.message}
              </div>
            )}
            <Button
              type="submit"
              disabled={createSweepMutation.isPending || !sweepTrainerInfo}
              style={{ alignSelf: "flex-end" }}
            >
              {createSweepMutation.isPending ? "Creating..." : "Create Sweep"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
