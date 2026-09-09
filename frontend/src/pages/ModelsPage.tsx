import { useState } from "react";
import { useParams } from "react-router-dom";
import { useModels } from "../features/models/hooks";
import { ModelStage } from "../features/models/types";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import type { TableColumn } from "../components/ui/Table";
import { Spinner } from "../components/ui/Spinner";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { RegisterModelModal } from "../features/models/components/RegisterModelModal";
import { ModelDetail } from "../features/models/components/ModelDetail";

interface ModelRow extends Record<string, unknown> {
  name: string;
  version: string;
  stage: ModelStage;
  metrics: Record<string, unknown>;
  created_at: string;
}

const STAGE_FILTER_OPTIONS = [
  { value: "", label: "All Stages" },
  { value: ModelStage.NONE, label: "None" },
  { value: ModelStage.STAGING, label: "Staging" },
  { value: ModelStage.PRODUCTION, label: "Production" },
  { value: ModelStage.ARCHIVED, label: "Archived" },
];

export function ModelsPage(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);
  const modelsQuery = useModels(pid);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const allModels = modelsQuery.data ?? [];
  const filteredModels = stageFilter
    ? allModels.filter((m) => m.stage === stageFilter)
    : allModels;

  if (selectedModel) {
    return (
      <div style={{ padding: "24px" }}>
        <ModelDetail
          modelName={selectedModel}
          onBack={() => setSelectedModel(null)}
        />
      </div>
    );
  }

  const columns: TableColumn<ModelRow>[] = [
    { key: "name", label: "Name" },
    { key: "version", label: "Latest Version" },
    {
      key: "stage",
      label: "Stage",
      render: (value) => (
        <Badge variant={value as ModelStage}>{value as string}</Badge>
      ),
    },
    {
      key: "metrics",
      label: "Accuracy",
      render: (value) => {
        const m = value as Record<string, unknown>;
        const acc = m?.accuracy ?? m?.test_accuracy;
        return acc != null ? Number(acc).toFixed(4) : "—";
      },
    },
    {
      key: "created_at",
      label: "Registered",
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <PageHeader title="Model Registry">
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Select
            label="Filter by stage"
            options={STAGE_FILTER_OPTIONS}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          />
          <Button onClick={() => setIsRegisterModalOpen(true)}>
            Register Model
          </Button>
        </div>
      </PageHeader>

      {modelsQuery.isLoading ? (
        <Spinner />
      ) : filteredModels.length === 0 ? (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          {allModels.length === 0
            ? "No models registered yet. Register a completed training run to get started."
            : "No models match the selected stage filter."}
        </div>
      ) : (
        <Table
          columns={columns}
          rows={filteredModels as unknown as ModelRow[]}
          onRowClick={(row) => setSelectedModel(row.name as string)}
        />
      )}

      <RegisterModelModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />
    </div>
  );
}
