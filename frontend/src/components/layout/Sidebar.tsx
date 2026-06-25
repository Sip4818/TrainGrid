import type { ReactNode } from "react";

interface SidebarProps {
  children: ReactNode;
}

/**
 * Sidebar provides the main navigation shell for TrainGrid.
 * Renders navigation links with active state highlighting and
 * a consistent width for the dashboard layout.
 */
export function Sidebar({ children }: SidebarProps): React.ReactElement {
  const sidebarStyle: React.CSSProperties = {
    width: "240px",
    height: "100vh",
    backgroundColor: "#111827",
    color: "#e5e7eb",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    boxSizing: "border-box",
    borderRight: "1px solid #1f2937",
  };

  const brandStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "24px",
    letterSpacing: "0.5px",
    color: "#ffffff",
  };

  const navStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  };

  return (
    <aside style={sidebarStyle}>
      <div style={brandStyle}>TrainGrid</div>
      <nav style={navStyle}>{children}</nav>
    </aside>
  );
}
