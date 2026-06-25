import { useParams, useNavigate } from "react-router-dom";
import { useRun } from "../features/runs/hooks";
import { RunStatus } from "../features/runs/types";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/layout/PageHeader";

/**
 * Human-readable label for each run status.
 */
const statusLabels: Record<RunStatus, string> = {
  [RunStatus.PENDING]: "Pending",
  [RunStatus.RUNNING]: "Running",
  [RunStatus.COMPLETED]: "Completed",
  [RunStatus.FAILED]: "Failed",
  [RunStatus.CANCELLED]: "Cancelled",
};

/**
 * Format an ISO date string to a human-readable locale string.
 * Returns "\u2014" (em dash) for null/undefined values.
 */
function formatDate(value: string | null | undefined): string {
  if (!value) return "\u2014";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

/**
 * Section wrapper for consistent card styling.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px 24px",
      }}
    >
      <h3
        style={{
          margin: "0 0 12px 0",
          fontSize: "14px",
          fontWeight: 600,
          color: "#374151",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * Key-value row used inside sections.
 */
function KeyValue({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid #f3f4f6",
        fontSize: "14px",
      }}
    >
      <span style={{ color: "#6b7280", fontWeight: 500 }}>{label}</span>
      <span style={{ color: "#111827", fontFamily: "monospace" }}>
        {value}
      </span>
    </div>
  );
}

export function RunDetailPage(): React.ReactElement {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const id = Number(runId);

  const { data: run, isLoading, isError, error } = useRun(id);

  // Invalid run ID
  if (!runId || Number.isNaN(id)) {
    return (
      <div style={{ padding: "48px 32px" }}>
        <PageHeader title="Invalid Run" description="No valid run ID provided." />
        <Button onClick={() => navigate("/runs")} style={{ marginTop: "16px" }}>
          Back to Runs
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <PageHeader title={`Run #${id}`} description="Loading run details..." />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <PageHeader title={`Run #${id}`} description="Failed to load run details" />
        <div style={{ padding: "32px" }}>
          <div
            style={{
              color: "#dc2626",
              backgroundColor: "#fee2e2",
              padding: "12px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            Failed to load run: {message}
          </div>
          <Button onClick={() => navigate("/runs")}>Back to Runs</Button>
        </div>
      </div>
    );
  }

  // Run not found (empty response)
  if (!run) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <PageHeader title={`Run #${id}`} description="Run not found" />
        <div style={{ padding: "32px" }}>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            The requested run does not exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/runs")} style={{ marginTop: "16px" }}>
            Back to Runs
          </Button>
        </div>
      </div>
    );
  }
  // --- Success: render full detail view ---
  const config = run.config;
  const metrics = run.metrics ?? {};
  const hasMetrics = Object.keys(metrics).length > 0;

  // Build config display, omitting undefined values
  const configEntries: { label: string; value: string }[] = [
    { label: "Dataset Path", value: config.dataset_path },
    { label: "Target Column", value: config.target_column },
    {
      label: "Feature Columns",
      value: config.feature_columns?.join(", ") ?? "\u2014",
    },
  ];
  if (config.n_estimators !== undefined) {
    configEntries.push({
      label: "N Estimators",
      value: String(config.n_estimators),
    });
  }
  if (config.max_depth !== undefined && config.max_depth !== null) {
    configEntries.push({ label: "Max Depth", value: String(config.max_depth) });
  } else if (config.max_depth === null) {
    configEntries.push({ label: "Max Depth", value: "Unlimited" });
  }

  const timelineEntries = [
    { label: "Created At", value: formatDate(run.created_at) },
    { label: "Started At", value: formatDate(run.started_at) },
    { label: "Finished At", value: formatDate(run.finished_at) },
  ];

  const metricsEntries = hasMetrics
    ? Object.entries(metrics).map(([key, val]) => ({
        label: key,
        value: String(val),
      }))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <PageHeader
        title={`Run #${run.id}`}
        description={`Experiment #${run.experiment_id} \u2014 ${statusLabels[run.status as RunStatus] ?? run.status}`}
      >
        <Button onClick={() => navigate("/runs")}>Back to Runs</Button>
      </PageHeader>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Status Summary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#374151" }}>
            Status
          </span>
          <Badge variant={run.status as RunStatus}>
            {statusLabels[run.status as RunStatus] ?? run.status}
          </Badge>
        </div>

        {/* Config */}
        <Section title="Configuration">
          {configEntries.map((entry) => (
            <KeyValue
              key={entry.label}
              label={entry.label}
              value={entry.value}
            />
          ))}
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          {timelineEntries.map((entry) => (
            <KeyValue
              key={entry.label}
              label={entry.label}
              value={entry.value}
            />
          ))}
        </Section>

        {/* Metrics */}
        <Section title="Metrics">
          {hasMetrics ? (
            metricsEntries.map((entry) => (
              <KeyValue
                key={entry.label}
                label={entry.label}
                value={entry.value}
              />
            ))
          ) : (
            <p
              style={{
                color: "#9ca3af",
                fontSize: "14px",
                margin: "8px 0",
              }}
            >
              No metrics yet.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
