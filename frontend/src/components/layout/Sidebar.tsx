import { Link, NavLink, useParams } from "react-router-dom";
import { useProjects } from "../../features/projects/hooks";

/**
 * Sidebar is an MLflow-style project navigator.
 * Fetches projects (with nested experiments) and displays them
 * in a tree structure with active state highlighting.
 */
export function Sidebar(): React.ReactElement {
  const { projectId } = useParams<{ projectId?: string }>();
  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];

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
    overflowY: "auto",
  };

  const brandStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "24px",
    letterSpacing: "0.5px",
    color: "#ffffff",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#9ca3af",
    marginBottom: "8px",
    marginTop: "0",
  };

  const projectLinkStyle: React.CSSProperties = {
    display: "block",
    padding: "6px 8px",
    borderRadius: "4px",
    color: "#e5e7eb",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
  };

  const projectLinkActiveStyle: React.CSSProperties = {
    ...projectLinkStyle,
    backgroundColor: "#1e40af",
    color: "#ffffff",
  };

  const experimentLinkStyle: React.CSSProperties = {
    display: "block",
    padding: "4px 8px 4px 24px",
    color: "#9ca3af",
    textDecoration: "none",
    fontSize: "13px",
  };

  return (
    <aside style={sidebarStyle}>
      <div style={brandStyle}>TrainGrid</div>

      <div style={{ marginBottom: "16px" }}>
        <Link
          to="/projects"
          style={{
            display: "inline-block",
            padding: "4px 8px",
            fontSize: "13px",
            color: "#93c5fd",
            textDecoration: "none",
          }}
        >
          + New Project
        </Link>
      </div>

      <div style={{ flex: 1 }}>
        <div style={sectionHeaderStyle}>Projects</div>
        <nav>
          {projects.map((project) => {
            const isActive = projectId !== undefined && Number(projectId) === project.id;
            return (
              <div key={project.id} style={{ marginBottom: "4px" }}>
                <NavLink
                  to={`/projects/${project.id}`}
                  style={({ isActive: linkActive }) =>
                    linkActive || isActive ? projectLinkActiveStyle : projectLinkStyle
                  }
                >
                  {project.name}
                </NavLink>
                {isActive && project.experiments.length > 0 && (
                  <div style={{ marginTop: "2px" }}>
                    {project.experiments.map((experiment) => (
                      <NavLink
                        key={experiment.id}
                        to={`/projects/${project.id}/experiments/${experiment.id}`}
                        style={({ isActive: linkActive }) => ({
                          ...experimentLinkStyle,
                          color: linkActive ? "#ffffff" : "#9ca3af",
                          fontWeight: linkActive ? 500 : 400,
                        })}
                      >
                        {experiment.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
