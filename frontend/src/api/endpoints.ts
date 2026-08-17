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
    /**
     * GET /runs/ — list all training runs.
     * Optionally scope to a single experiment via ?experiment_id=.
     */
    list: (experimentId?: number) =>
      experimentId !== undefined
        ? (`/runs/?experiment_id=${experimentId}` as const)
        : ("/runs/" as const),

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
  projects: {
    /** GET /projects/ — list all projects with their nested experiments */
    list: () => "/projects/" as const,

    /** GET /projects/{id} — get a single project with its nested experiments */
    detail: (id: number) => `/projects/${id}` as const,

    /** POST /projects/ — create a new project */
    create: () => "/projects/" as const,

    /** DELETE /projects/{id} — delete a project (cascades to experiments and runs) */
    delete: (id: number) => `/projects/${id}` as const,
  },
  experiments: {
    /**
     * GET /experiments/ — list all experiments.
     * Optionally scope to a single project via ?project_id=.
     */
    list: (projectId?: number) =>
      projectId !== undefined
        ? (`/experiments/?project_id=${projectId}` as const)
        : ("/experiments/" as const),

    /** GET /experiments/{id} — get a single experiment */
    detail: (id: number) => `/experiments/${id}` as const,

    /** POST /experiments/ — create a new experiment within a project */
    create: () => "/experiments/" as const,

    /** DELETE /experiments/{id} — delete an experiment (cascades to runs) */
    delete: (id: number) => `/experiments/${id}` as const,
  },
} as const;

