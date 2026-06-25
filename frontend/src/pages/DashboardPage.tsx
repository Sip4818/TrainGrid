import { useNavigate } from "react-router-dom";
import { useRuns } from "../features/runs/hooks";
import { RunStatus } from "../features/runs/types";
import { Spinner } from "../components/ui/Spinner";
import { PageHeader } from "../components/layout/PageHeader";

interface StatusCard {
  label: string;
  status: RunStatus | "total";
  count: number;
  accentColor: string;
}

const statusCardMeta: { label: string; status: RunStatus | "total"; accentColor: string }[] = [
  { label: "Total", status: "total", accentColor: "#374151" },
  { label: "Pending", status: RunStatus.PENDING, accentColor: "#f59e0b" },
  { label: "Running", status: RunStatus.RUNNING, accentColor: "#3b82f6" },
  { label: "Completed", status: RunStatus.COMPLETED, accentColor: "#10b981" },
  { label: "Failed", status: RunStatus.FAILED, accentColor: "#ef4444" },
  { label: "Cancelled", status: RunStatus.CANCELLED, accentColor: "#9ca3af" },
];

function SummaryCard({
  label,
  count,
  accentColor,
  onClick,
}: StatusCard & { onClick: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "24px",
        borderLeft: `4px solid ${accentColor}`,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        transition: "box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1,
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#6b7280",
        }}
      >
        {label}
      </span>
    </button>
  );
}

export function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const runsQuery = useRuns();

  const isLoading = runsQuery.isLoading;
  const isError = runsQuery.isError;
  const error = runsQuery.error as Error | null;

  const runs = runsQuery.data ?? [];

  const countByStatus = runs.reduce<Record<string, number>>((acc, run) => {
    const key = run.status as string;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const totalCount = runs.length;

  const cards: StatusCard[] = statusCardMeta.map((meta) => ({
    ...meta,
    count:
      meta.status === "total"
        ? totalCount
        : countByStatus[meta.status as string] ?? 0,
  }));

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <PageHeader title="Dashboard" description="Overview of training activity" />
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <PageHeader title="Dashboard" description="Overview of training activity" />
        <div style={{ padding: "32px" }}>
          <div
            style={{
              color: "#dc2626",
              backgroundColor: "#fee2e2",
              padding: "12px 16px",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            Failed to load dashboard: {message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <PageHeader title="Dashboard" description="Overview of training activity" />

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "32px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {cards.map((card) => (
            <SummaryCard
              key={card.status as string}
              label={card.label}
              status={card.status}
              count={card.count}
              accentColor={card.accentColor}
              onClick={() => navigate("/runs")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
