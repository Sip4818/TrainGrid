import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Run, RunComparisonResponse, RunCreate } from "./types";

/**
 * Fetch all training runs.
 * GET /runs/
 */
export function getRuns(): Promise<Run[]> {
  return apiClient.get<Run[]>(endpoints.runs.list());
}

/**
 * Fetch a single training run by ID.
 * GET /runs/{id}
 */
export function getRun(id: number): Promise<Run> {
  return apiClient.get<Run>(endpoints.runs.detail(id));
}

/**
 * Create a new training run.
 * POST /runs/
 */
export function createRun(data: RunCreate): Promise<Run> {
  return apiClient.post<Run>(endpoints.runs.create(), data);
}

/**
 * Compare multiple training runs side-by-side within an experiment.
 * GET /runs/compare?experiment_id={id}&run_ids={id}&run_ids={id}
 */
export function compareRuns(
  experimentId: number,
  runIds: number[],
): Promise<RunComparisonResponse> {
  return apiClient.get<RunComparisonResponse>(
    endpoints.runs.compare(experimentId, runIds),
  );
}

