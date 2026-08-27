import { Link, useParams, useLocation } from "react-router-dom";
import { useProject } from "../../features/projects/hooks";

interface Crumb {
  label: string;
  to?: string;
}

/**
 * Breadcrumbs renders a navigation trail based on the current route params.
 * projectId is always present in the URL (except /projects), so we always
 * use useProject(projectId) to resolve names. No fallback search needed.
 */
export function Breadcrumbs(): React.ReactElement {
  const { projectId, experimentId, runId } = useParams<{
    projectId?: string;
    experimentId?: string;
    runId?: string;
  }>();
  const location = useLocation();

  const crumbs: Crumb[] = [{ label: "Projects", to: "/projects" }];

  if (projectId !== undefined) {
    const pid = Number(projectId);
    const projectQuery = useProject(pid);
    const projectName = projectQuery.data?.name ?? String(pid);
    crumbs.push({ label: projectName, to: `/projects/${pid}` });

    if (experimentId !== undefined) {
      const eid = Number(experimentId);
      const experimentName =
        projectQuery.data?.experiments.find((e) => e.id === eid)?.name ??
        String(eid);
      crumbs.push({
        label: experimentName,
        to: `/projects/${pid}/experiments/${eid}`,
      });

      if (runId !== undefined) {
        crumbs.push({ label: `Run #${runId}` });
      } else if (location.pathname.endsWith("/compare")) {
        crumbs.push({ label: "Compare" });
      }
    }
  }

  const separatorStyle: React.CSSProperties = {
    margin: "0 8px",
    color: "#9ca3af",
  };

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        padding: "12px 32px",
        fontSize: "14px",
        color: "#6b7280",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`}>
          {i > 0 && <span style={separatorStyle}>/</span>}
          {crumb.to ? (
            <Link
              to={crumb.to}
              style={{ color: "#2563eb", textDecoration: "none" }}
            >
              {crumb.label}
            </Link>
          ) : (
            <span style={{ color: "#111827", fontWeight: 500 }}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
