import type { ReactNode } from "react";
import { RunStatus } from "../../features/runs/types";
import { ModelStage } from "../../features/models/types";
import { DeploymentStatus } from "../../features/deployments/types";

type BadgeVariant = RunStatus | ModelStage | DeploymentStatus | "default";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

function getVariantStyle(variant: BadgeVariant): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  };

  const colors: Record<string, React.CSSProperties> = {
    pending: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      border: "1px solid #f59e0b",
    },
    running: {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
      border: "1px solid #3b82f6",
    },
    completed: {
      backgroundColor: "#d1fae5",
      color: "#065f46",
      border: "1px solid #10b981",
    },
    failed: {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #ef4444",
    },
    cancelled: {
      backgroundColor: "#f3f4f6",
      color: "#4b5563",
      border: "1px solid #9ca3af",
    },
    none: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db",
    },
    staging: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      border: "1px solid #f59e0b",
    },
    production: {
      backgroundColor: "#d1fae5",
      color: "#065f46",
      border: "1px solid #10b981",
    },
    archived: {
      backgroundColor: "#f3f4f6",
      color: "#6b7280",
      border: "1px solid #9ca3af",
    },
    active: {
      backgroundColor: "#d1fae5",
      color: "#065f46",
      border: "1px solid #10b981",
    },
    stopped: {
      backgroundColor: "#f3f4f6",
      color: "#4b5563",
      border: "1px solid #9ca3af",
    },
    default: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db",
    },
  };

  return { ...base, ...(colors[variant] ?? colors.default) };
}

export function Badge({
  children,
  variant = "default",
}: BadgeProps): React.ReactElement {
  return <span style={getVariantStyle(variant)}>{children}</span>;
}
