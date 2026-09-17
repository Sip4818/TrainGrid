import { useModelVersions, usePromoteModel } from "../hooks";
import { ModelStage } from "../types";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Table } from "../../../components/ui/Table";
import type { TableColumn } from "../../../components/ui/Table";
import { Spinner } from "../../../components/ui/Spinner";

interface ModelDetailProps {
  modelName: string;
  onBack: () => void;
}

/**
 * Targets that move a version toward active use read as promotions;
 * targets that move it out of active use read as demotions.
 */
function actionLabel(target: ModelStage): string {
  return target === ModelStage.STAGING || target === ModelStage.PRODUCTION
    ? `Promote → ${target}`
    : `Demote → ${target}`;
}

interface VersionRow extends Record<string, unknown> {
  version: string;
  stage: ModelStage;
  metrics: Record<string, unknown>;
  created_at: string;
  run_id: number;
  allowed_stages: ModelStage[];
}

export function ModelDetail({
  modelName,
  onBack,
}: ModelDetailProps): React.ReactElement {
  const versionsQuery = useModelVersions(modelName);
  const promoteMutation = usePromoteModel();

  const versions = versionsQuery.data ?? [];
  const latest = versions[0];

  const handlePromote = async (version: string, stage: ModelStage) => {
    await promoteMutation.mutateAsync({
      name: modelName,
      version,
      data: { stage },
    });
  };

  const columns: TableColumn<VersionRow>[] = [
    { key: "version", label: "Version" },
    {
      key: "stage",
      label: "Stage",
      render: (value) => <Badge variant={value as ModelStage}>{value as string}</Badge>,
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
      key: "run_id",
      label: "Run ID",
      render: (value) => String(value),
    },
    {
      key: "created_at",
      label: "Created",
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
    {
      key: "version",
      label: "Actions",
      render: (_value, row) => {
        const allowed = (row.allowed_stages as ModelStage[] | undefined) ?? [];
        return (
          <div style={{ display: "flex", gap: "6px" }}>
            {allowed.map((target) => (
              <Button
                key={target}
                variant="secondary"
                onClick={() => handlePromote(row.version as string, target)}
                disabled={promoteMutation.isPending}
              >
                {actionLabel(target)}
              </Button>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
        <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
          {modelName}
        </h2>
        {latest && (
          <Badge variant={latest.stage}>{latest.stage}</Badge>
        )}
      </div>

      {latest?.description && (
        <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "16px" }}>
          {latest.description}
        </p>
      )}

      {versionsQuery.isLoading ? (
        <Spinner />
      ) : (
        <>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Version History
          </h3>
          <Table
            columns={columns}
            rows={versions as unknown as VersionRow[]}
          />

          {latest && (
            <div style={{ marginTop: "24px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  marginBottom: "12px",
                }}
              >
                Metadata
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  fontSize: "14px",
                }}
              >
                <MetadataItem label="Artifact Path" value={latest.artifact_path} />
                <MetadataItem
                  label="Artifact Checksum"
                  value={latest.artifact_checksum ?? "—"}
                />
                <MetadataItem
                  label="Dataset Hash"
                  value={latest.dataset_hash ?? "—"}
                />
                <MetadataItem label="Run ID" value={String(latest.run_id)} />
              </div>
              {latest.config && Object.keys(latest.config).length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      marginBottom: "4px",
                    }}
                  >
                    Config
                  </div>
                  <pre
                    style={{
                      padding: "12px",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontFamily: "monospace",
                      overflow: "auto",
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(latest.config, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>
        {label}
      </div>
      <div style={{ fontWeight: 500, wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}
