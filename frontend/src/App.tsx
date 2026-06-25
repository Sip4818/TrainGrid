import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./app/routes";

const router = createBrowserRouter(routes);

export function App(): React.ReactElement {
  return <RouterProvider router={router} />;
}
