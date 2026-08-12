/**
 * API endpoint path constants.
 * All paths are relative to the API base URL (configured via VITE_API_BASE_URL).
 */
export const endpoints = {
  trainers: {
    /** GET /trainers/ — list all registered trainers */
    list: () => "/trainers/" as const,
  },
  runs: {
    /** GET /runs/ — list all training runs */
    list: () => "/runs/" as const,

    /** GET /runs/{id} — get a single run by ID */
    detail: (id: number) => `/runs/${id}` as const,

    /** POST /runs/ — create a new training run */
    create: () => "/runs/" as const,

    /**
     * GET /runs/compare — compare runs side-by-side within an experiment.
     * run_ids are sent as repeated query params (e.g. run_ids=1&run_ids=2).
     */
    compare: (experimentId: number, runIds: number[]) =>
      `/runs/compare?experiment_id=${experimentId}&${runIds
        .map((id) => `run_ids=${id}`)
        .join("&")}` as const,
  },
} as const;

