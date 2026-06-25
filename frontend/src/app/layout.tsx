import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";

interface LayoutProps {
  children?: ReactNode;
}

const shellStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  backgroundColor: "#f9fafb",
};

/**
 * Layout is the persistent application shell rendered on every page.
 * It composes the Sidebar, Topbar, and a scrollable content area where
 * routed pages render via React Router's <Outlet />.
 */
export function Layout({ children }: LayoutProps): React.ReactElement {
  return (
    <div style={shellStyle}>
      <Sidebar />
      <div style={mainStyle}>
        <Topbar />
        <main style={contentStyle}>{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
