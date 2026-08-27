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
     * GET /runs/ — list all training runs scoped to an experiment within a project.
     */
    list: (projectId: number, experimentId: number) =>
      `/runs/?project_id=${projectId}&experiment_id=${experimentId}` as const,

    /**
     * GET /runs/{id} — get a single run by ID, scoped to its project and experiment.
     */
    detail: (id: number, projectId: number, experimentId: number) =>
      `/runs/${id}?project_id=${projectId}&experiment_id=${experimentId}` as const,

    /** POST /runs/ — create a new training run */
    create: () => "/runs/" as const,

    /**
     * DELETE /runs/{id} — delete a run, scoped to its project and experiment.
     */
    delete: (id: number, projectId: number, experimentId: number) =>
      `/runs/${id}?project_id=${projectId}&experiment_id=${experimentId}` as const,

    /**
     * GET /runs/compare — compare runs side-by-side within an experiment.
     * run_ids are sent as repeated query params (e.g. run_ids=1&run_ids=2).
     */
    compare: (projectId: number, experimentId: number, runIds: number[]) =>
      `/runs/compare?project_id=${projectId}&experiment_id=${experimentId}&${runIds
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
     * GET /experiments/ — list all experiments within a project.
     */
    list: (projectId: number) =>
      `/experiments/?project_id=${projectId}` as const,

    /**
     * GET /experiments/{id} — get a single experiment, scoped to its project.
     */
    detail: (id: number, projectId: number) =>
      `/experiments/${id}?project_id=${projectId}` as const,

    /** POST /experiments/ — create a new experiment within a project */
    create: () => "/experiments/" as const,

    /**
     * DELETE /experiments/{id} — delete an experiment, scoped to its project.
     */
    delete: (id: number, projectId: number) =>
      `/experiments/${id}?project_id=${projectId}` as const,
  },
  datasets: {
    /** GET /datasets/ — list all uploaded datasets */
    list: () => "/datasets/" as const,

    /** POST /datasets/ — upload a CSV dataset (multipart/form-data) */
    upload: () => "/datasets/" as const,
  },
} as const;

