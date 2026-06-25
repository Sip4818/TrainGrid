import type { ReactNode } from "react";

interface TopbarProps {
  children?: ReactNode;
}

/**
 * Topbar sits above the page content and displays the application name
 * along with an optional action area (e.g. user menu, theme toggle).
 * Uses a fixed height and subtle border for clean visual separation.
 */
export function Topbar({ children }: TopbarProps): React.ReactElement {
  const topbarStyle: React.CSSProperties = {
    height: "56px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    boxSizing: "border-box",
  };

  const brandStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
    letterSpacing: "0.3px",
  };

  const actionsStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  return (
    <header style={topbarStyle}>
      <div style={brandStyle}>TrainGrid</div>
      <div style={actionsStyle}>{children}</div>
    </header>
  );
}
