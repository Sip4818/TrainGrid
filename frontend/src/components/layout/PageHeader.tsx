import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * PageHeader provides a consistent title and description area for every page.
 * Optionally renders action buttons (e.g. "Create Run") via the children slot.
 */
export function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps): React.ReactElement {
  const headerStyle: React.CSSProperties = {
    padding: "24px 32px 16px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 4px 0",
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 16px 0",
  };

  const actionsStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
  };

  return (
    <div style={headerStyle}>
      <h1 style={titleStyle}>{title}</h1>
      {description ? <p style={descriptionStyle}>{description}</p> : null}
      {children ? <div style={actionsStyle}>{children}</div> : null}
    </div>
  );
}
