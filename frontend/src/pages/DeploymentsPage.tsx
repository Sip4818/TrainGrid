import { useState } from "react";
import { useParams } from "react-router-dom";
import { useDeployments, useDeployModel, useUndeployModel, usePredict } from "../features/deployments/hooks";
import { useModels } from "../features/models/hooks";
import { DeploymentStatus } from "../features/deployments/types";
import type { PredictResponse } from "../features/deployments/types";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import type { TableColumn } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";

interface DeploymentRow extends Record<string, unknown> {
  id: number;
  model_name: string;
  model_version: string;
  status: DeploymentStatus;
  started_at: string | null;
}

export function DeploymentsPage(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);
  const deploymentsQuery = useDeployments(pid);
  const modelsQuery = useModels(pid);
  const deployMutation = useDeployModel();
  const undeployMutation = useUndeployModel();
  const predictMutation = usePredict();

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [predictDeploymentId, setPredictDeploymentId] = useState<number | null>(null);
  const [predictInput, setPredictInput] = useState("{}");

  const deployments = deploymentsQuery.data ?? [];
  const registeredModels = modelsQuery.data ?? [];

  const availableVersions = registeredModels.filter(
    (m) => m.name === selectedModel,
  );

  const handleDeploy = async () => {
    if (!selectedModel || !selectedVersion) return;
    await deployMutation.mutateAsync({
      model_name: selectedModel,
      model_version: selectedVersion,
      project_id: pid,
    });
    setIsDeployModalOpen(false);
    setSelectedModel("");
    setSelectedVersion("");
  };

  const handleUndeploy = async (id: number) => {
    await undeployMutation.mutateAsync({ id, projectId: pid });
  };

  const handlePredict = async () => {
    if (predictDeploymentId === null) return;
    try {
      const features = JSON.parse(predictInput);
      await predictMutation.mutateAsync({
        deploymentId: predictDeploymentId,
        data: { features },
        projectId: pid,
      });
    } catch {
      // JSON parse error or API error
    }
  };

  const columns: TableColumn<DeploymentRow>[] = [
    { key: "id", label: "ID" },
    { key: "model_name", label: "Model" },
    { key: "model_version", label: "Version" },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={value as DeploymentStatus}>
          {value as string}
        </Badge>
      ),
    },
    {
      key: "started_at",
      label: "Deployed At",
      render: (value) =>
        value ? new Date(value as string).toLocaleString() : "—",
    },
    {
      key: "id",
      label: "Actions",
      render: (_value, row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          {row.status === DeploymentStatus.ACTIVE && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setPredictDeploymentId(row.id);
                  setPredictInput("{}");
                }}
              >
                Test
              </Button>
              <Button
                variant="danger"
                onClick={() => handleUndeploy(row.id)}
                disabled={undeployMutation.isPending}
              >
                Undeploy
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <PageHeader title="Deployments">
        <Button onClick={() => setIsDeployModalOpen(true)}>Deploy Model</Button>
      </PageHeader>

      {deploymentsQuery.isLoading ? (
        <Spinner />
      ) : (
        <Table columns={columns} rows={deployments as unknown as DeploymentRow[]} />
      )}

      {/* Deploy Modal */}
      <Modal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        title="Deploy Model"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            >
              <option value="">Select model...</option>
              {[...new Set(registeredModels.map((m) => m.name))].map(
                (modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
              Version
            </label>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              disabled={!selectedModel}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            >
              <option value="">Select version...</option>
              {availableVersions.map((m) => (
                <option key={m.version} value={m.version}>
                  {m.version} ({m.stage})
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleDeploy}
            disabled={!selectedModel || !selectedVersion || deployMutation.isPending}
          >
            {deployMutation.isPending ? "Deploying..." : "Deploy"}
          </Button>
        </div>
      </Modal>

      {/* Predict Modal */}
      <Modal
        isOpen={predictDeploymentId !== null}
        onClose={() => setPredictDeploymentId(null)}
        title="Test Prediction"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
              Features (JSON)
            </label>
            <textarea
              value={predictInput}
              onChange={(e) => setPredictInput(e.target.value)}
              rows={6}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                fontFamily: "monospace",
                resize: "vertical",
              }}
            />
          </div>
          <Button
            onClick={handlePredict}
            disabled={predictMutation.isPending}
          >
            {predictMutation.isPending ? "Predicting..." : "Run Prediction"}
          </Button>
          {predictMutation.data && (
            <PredictResult result={predictMutation.data} />
          )}
          {predictMutation.isError && (
            <div style={{ color: "#dc2626", fontSize: "14px" }}>
              {predictMutation.error.message}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function PredictResult({ result }: { result: PredictResponse }): React.ReactElement {
  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "6px",
        fontSize: "14px",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "8px" }}>
        Results ({result.latency_ms.toFixed(1)}ms)
      </div>
      {result.predictions.map((pred, i) => (
        <div key={i} style={{ marginBottom: "4px" }}>
          <span style={{ fontWeight: 500 }}>Prediction:</span>{" "}
          {String(pred.prediction)}
          {pred.confidence !== null && (
            <>
              {" "}
              <span style={{ color: "#6b7280" }}>
                (confidence: {(pred.confidence * 100).toFixed(1)}%)
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
