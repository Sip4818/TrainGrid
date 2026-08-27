import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Run, RunComparisonResponse, RunCreate } from "./types";

/**
 * Fetch all training runs within a specific experiment.
 * GET /runs/?project_id={projectId}&experiment_id={experimentId}
 */
export function getRuns(
  projectId: number,
  experimentId: number,
): Promise<Run[]> {
  return apiClient.get<Run[]>(endpoints.runs.list(projectId, experimentId));
}

/**
 * Fetch a single training run by ID, scoped to its project and experiment.
 * GET /runs/{id}?project_id={projectId}&experiment_id={experimentId}
 */
export function getRun(
  id: number,
  projectId: number,
  experimentId: number,
): Promise<Run> {
  return apiClient.get<Run>(endpoints.runs.detail(id, projectId, experimentId));
}

/**
 * Create a new training run.
 * POST /runs/
 */
export function createRun(data: RunCreate): Promise<Run> {
  return apiClient.post<Run>(endpoints.runs.create(), data);
}

/**
 * Delete a training run by ID, scoped to its project and experiment.
 * DELETE /runs/{id}?project_id={projectId}&experiment_id={experimentId}
 */
export function deleteRun(
  id: number,
  projectId: number,
  experimentId: number,
): Promise<void> {
  return apiClient.del<void>(
    endpoints.runs.delete(id, projectId, experimentId),
  );
}

/**
 * Compare multiple training runs side-by-side within an experiment.
 * GET /runs/compare?project_id={projectId}&experiment_id={experimentId}&run_ids=...
 */
export function compareRuns(
  projectId: number,
  experimentId: number,
  runIds: number[],
): Promise<RunComparisonResponse> {
  return apiClient.get<RunComparisonResponse>(
    endpoints.runs.compare(projectId, experimentId, runIds),
  );
}
