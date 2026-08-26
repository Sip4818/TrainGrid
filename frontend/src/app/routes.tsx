import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { Layout } from "./layout";
import { ProjectsPage } from "../pages/ProjectsPage";
import { ProjectDetailPage } from "../pages/ProjectDetailPage";
import { ExperimentPage } from "../pages/ExperimentPage";
import { RunDetailPage } from "../pages/RunDetailPage";
import { RunComparisonPage } from "../pages/RunComparisonPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      {
        path: "projects",
        element: <ProjectsPage />,
      },
      {
        path: "projects/:projectId",
        element: <ProjectDetailPage />,
      },
      {
        path: "projects/:projectId/experiments/:experimentId",
        element: <ExperimentPage />,
      },
      {
        path: "projects/:projectId/experiments/:experimentId/runs/:runId",
        element: <RunDetailPage />,
      },
      {
        path: "projects/:projectId/experiments/:experimentId/compare",
        element: <RunComparisonPage />,
      },
      { path: "*", element: <Navigate to="/projects" replace /> },
    ],
  },
];
