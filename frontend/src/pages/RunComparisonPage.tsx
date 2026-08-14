import { useNavigate, useSearchParams } from "react-router-dom";
import { useRunComparison } from "../features/runs/hooks";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { PageHeader } from "../components/layout/PageHeader";

/**
 * Row in the comparison matrix. Each run's value lives under `run_${id}`
 * so the shared Table component can render columns per run.
 */
interface ComparisonRow extends Record<string, unknown> {
  label: string;
}

/**
 * Config fields shown above metric rows. A row is only rendered when at
 * least one compared run defines the field, so irrelevant hyperparameters
 * (e.g. learning_rate for random_forest) don't clutter the table.
 */
const CONFIG_FIELDS = ["n_estimators", "max_depth", "learning_rate"] as const;

/**
 * Format a cell value: numbers with limited precision, em dash for
 * null/undefined (e.g. random_forest's max_depth of null).
 */
function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toPrecision(4) : String(value);
  }
  if (value === null || value === undefined) return "\u2014";
  return String(value);
}

export function RunComparisonPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const experimentIdParam = searchParams.get("experiment_id");
  const experimentId = Number(experimentIdParam);
  const runIds = searchParams.getAll("run_ids").map(Number);

  const isValid =
    experimentIdParam !== null &&
    !Number.isNaN(experimentId) &&
    runIds.length >= 2 &&
    runIds.every((id) => !Number.isNaN(id));

  const { data, isLoading, isError, error } = useRunComparison(
    experimentId,
    isValid ? runIds : [],
  );

  const header = (
    <PageHeader
      title="Run Comparison"
      description={
        isValid
          ? `Experiment #${experimentId}`
          : "Select at least two runs from the Runs page to compare"
      }
    >
      <Button onClick={() => navigate("/runs")}>Back to Runs</Button>
    </PageHeader>
  );

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        {header}
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

  if (isError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        {header}
        <div
          style={{
            color: "#dc2626",
            backgroundColor: "#fee2e2",
            padding: "12px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            margin: "24px 32px",
          }}
        >
          Failed to load comparison:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  if (!isValid || !data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        {header}
        <div style={{ padding: "32px", color: "#9ca3af", fontSize: "14px" }}>
          No runs selected. Use the checkboxes on the Runs page to select at
          least two runs from the same experiment, then click Compare.
        </div>
      </div>
    );
  }

  const { runs, metrics } = data;

  const configRows: ComparisonRow[] = CONFIG_FIELDS.filter((key) =>
    runs.some((run) => run.config[key] !== undefined),
  ).map((key) => {
    const row: ComparisonRow = { label: key };
    for (const run of runs) {
      row[`run_${run.id}`] = run.config[key];
    }
    return row;
  });

  const metricRows: ComparisonRow[] = metrics.map((metric) => {
    const row: ComparisonRow = { label: metric };
    for (const run of runs) {
      row[`run_${run.id}`] = run.metrics[metric];
    }
    return row;
  });

  const rows = [...configRows, ...metricRows];

  const columns = [
    { key: "label" as const, label: "Metric" },
    ...runs.map((run) => ({
      key: `run_${run.id}` as const,
      label: `Run #${run.id} \u2014 ${run.trainer_name}`,
      render: (value: unknown) => <span>{formatValue(value)}</span>,
    })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {header}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          {runs.map((run) => (
            <Badge key={run.id} variant={run.status}>
              {`Run #${run.id}`}
            </Badge>
          ))}
        </div>
        <Table columns={columns} rows={rows} />
      </div>
    </div>
  );
}
