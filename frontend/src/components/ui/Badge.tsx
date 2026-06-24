import type { ReactNode } from "react";
import { RunStatus } from "../../features/runs/types";

type BadgeVariant = RunStatus | "default";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  [RunStatus.PENDING]: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    border: "1px solid #f59e0b",
  },
  [RunStatus.RUNNING]: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    border: "1px solid #3b82f6",
  },
  [RunStatus.COMPLETED]: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
    border: "1px solid #10b981",
  },
  [RunStatus.FAILED]: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #ef4444",
  },
  [RunStatus.CANCELLED]: {
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

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "capitalize",
  whiteSpace: "nowrap",
};

export function Badge({
  children,
  variant = "default",
}: BadgeProps): React.ReactElement {
  return (
    <span
      style={{
        ...baseStyle,
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  );
}

