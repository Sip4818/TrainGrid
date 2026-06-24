/**
 * API endpoint path constants.
 * All paths are relative to the API base URL (configured via VITE_API_BASE_URL).
 */
export const endpoints = {
  runs: {
    /** GET /runs/ — list all training runs */
    list: () => "/runs/" as const,

    /** GET /runs/{id} — get a single run by ID */
    detail: (id: number) => `/runs/${id}` as const,

    /** POST /runs/ — create a new training run */
    create: () => "/runs/" as const,
  },
} as const;

