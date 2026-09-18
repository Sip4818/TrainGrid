import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Sweep, SweepCreate } from "./types";

/**
 * Fetch all hyperparameter sweeps within a specific experiment.
 * GET /sweeps/?project_id={projectId}&experiment_id={experimentId}
 */
export function listSweeps(
  projectId: number,
  experimentId: number,
): Promise<Sweep[]> {
  return apiClient.get<Sweep[]>(endpoints.sweeps.list(projectId, experimentId));
}

/**
 * Fetch a single hyperparameter sweep by ID, scoped to its project
 * and experiment.
 * GET /sweeps/{id}?project_id={projectId}&experiment_id={experimentId}
 */
export function getSweep(
  id: number,
  projectId: number,
  experimentId: number,
): Promise<Sweep> {
  return apiClient.get<Sweep>(endpoints.sweeps.detail(id, projectId, experimentId));
}

/**
 * Create a new hyperparameter sweep and dispatch its child runs.
 * POST /sweeps/
 */
export function createSweep(data: SweepCreate): Promise<Sweep> {
  return apiClient.post<Sweep>(endpoints.sweeps.create(), data);
}
