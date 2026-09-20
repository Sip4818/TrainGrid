import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Table } from "../../../components/ui/Table";
import type { TableColumn } from "../../../components/ui/Table";
import type { Run } from "../../runs/types";
import { RunStatus } from "../../runs/types";
import type { Sweep } from "../types";
import { SweepGoal, SweepStatus } from "../types";

interface SweepDetailProps {
  sweep: Sweep;
  childRuns: Run[];
  onBack: () => void;
  onSelectRun: (runId: number) => void;
}

interface CombinationRow extends Record<string, unknown> {
  id: number;
  status: RunStatus;
  hyperparameters: Record<string, unknown>;
  metricValue: number | null;
}

function formatHyperparameters(
  run: Run,
  searchKeys: string[],
): Record<string, unknown> {
  const config = (run.config ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of searchKeys) {
    out[key] = config[key] ?? "—";
  }
  return out;
}

function formatMetricValue(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toPrecision(4);
}

/**
 * SweepDetail shows one sweep's child-run combinations with the winning
 * run highlighted. Presentational — the parent supplies the sweep and its
 * child runs. Mirrors the ModelDetail inline-detail pattern.
 */
export function SweepDetail({
  sweep,
  childRuns,
  onBack,
  onSelectRun,
}: SweepDetailProps): React.ReactElement {
  const searchKeys = Object.keys(sweep.search_space ?? {});
  const bestRun = childRuns.find((run) => run.id === sweep.best_run_id) ?? null;

  const rows: CombinationRow[] = childRuns.map((run) => {
    const metrics = (run.metrics ?? {}) as Record<string, unknown>;
    const raw = metrics[sweep.metric];
    return {
      id: run.id,
      status: run.status,
      hyperparameters: formatHyperparameters(run, searchKeys),
      metricValue: typeof raw === "number" ? raw : null,
    };
  });

  const columns: TableColumn<CombinationRow>[] = [
    {
      key: "id",
      label: "Run ID",
      render: (value) => (
        <span style={{ fontWeight: 600 }}>{value as number}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={value as RunStatus}>{String(value)}</Badge>
      ),
    },
    {
      key: "hyperparameters",
      label: "Hyperparameters",
      render: (value) => {
        const params = value as Record<string, unknown>;
        return Object.entries(params)
          .map(([key, param]) => `${key}=${String(param)}`)
          .join(", ");
      },
    },
    {
      key: "metricValue",
      label: sweep.metric,
      render: (value) => formatMetricValue(value as number | null),
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
          Sweep #{sweep.id}
        </h2>
        <Badge variant={sweep.status}>{sweep.status}</Badge>
      </div>

      <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "16px" }}>
        {sweep.trainer_name} · {sweep.strategy} ·{" "}
        {sweep.goal === SweepGoal.MINIMIZE ? "minimize" : "maximize"}{" "}
        {sweep.metric}
      </p>

      {sweep.status === SweepStatus.COMPLETED && bestRun && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          Best run:{" "}
          <button
            type="button"
            onClick={() => onSelectRun(bestRun.id)}
            style={{
              fontWeight: 600,
              color: "#2563eb",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "14px",
            }}
          >
            Run #{bestRun.id}
          </button>
        </div>
      )}

      {sweep.status === SweepStatus.RUNNING && (
        <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "16px" }}>
          Training in progress — results appear automatically.
        </div>
      )}

      {sweep.status === SweepStatus.FAILED && (
        <div style={{ color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>
          Sweep failed: no completed runs produced the target metric.
        </div>
      )}

      <h3
        style={{
          fontSize: "16px",
          fontWeight: 600,
          marginBottom: "12px",
        }}
      >
        Combinations
      </h3>
      <Table
        columns={columns}
        rows={rows}
        onRowClick={(row) => onSelectRun(row.id as number)}
      />
    </div>
  );
}
