import { useState } from "react";
import { useRegisterModel } from "../hooks";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";

interface RegisterModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterModelModal({
  isOpen,
  onClose,
}: RegisterModelModalProps): React.ReactElement {
  const registerMutation = useRegisterModel();

  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [runId, setRunId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setVersion("");
    setRunId("");
    setDescription("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name || !version || !runId) return;
    setError(null);
    try {
      await registerMutation.mutateAsync({
        name,
        version,
        run_id: Number(runId),
        description: description || undefined,
      });
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to register model",
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Register Model">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Input
          label="Model Name"
          id="reg-model-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. fraud-detector"
        />
        <Input
          label="Version"
          id="reg-model-version"
          type="text"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. v1.0.0"
        />
        <Input
          label="Run ID"
          id="reg-model-run-id"
          type="number"
          value={runId}
          onChange={(e) => setRunId(e.target.value)}
          placeholder="Completed run ID"
        />
        <div>
          <label
            htmlFor="reg-model-description"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "4px",
            }}
          >
            Description (optional)
          </label>
          <textarea
            id="reg-model-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              resize: "vertical",
            }}
          />
        </div>
        {error && (
          <div style={{ color: "#dc2626", fontSize: "14px" }}>{error}</div>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!name || !version || !runId || registerMutation.isPending}
        >
          {registerMutation.isPending ? "Registering..." : "Register Model"}
        </Button>
      </div>
    </Modal>
  );
}
