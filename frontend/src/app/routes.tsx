import type { RouteObject } from "react-router-dom";
import { Layout } from "./layout";
import { DashboardPage } from "../pages/DashboardPage";
import { RunsPage } from "../pages/RunsPage";
import { RunDetailPage } from "../pages/RunDetailPage";
import { RunComparisonPage } from "../pages/RunComparisonPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "runs",
        element: <RunsPage />,
      },
      {
        path: "runs/compare",
        element: <RunComparisonPage />,
      },
      {
        path: "runs/:runId",
        element: <RunDetailPage />,
      },
    ],
  },
];
