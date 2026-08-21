import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Experiment, ExperimentCreate } from "./types";

/**
 * Fetch all experiments within a project.
 * GET /experiments/?project_id={projectId}
 */
export function getExperiments(projectId: number): Promise<Experiment[]> {
  return apiClient.get<Experiment[]>(endpoints.experiments.list(projectId));
}

/**
 * Fetch a single experiment by ID, scoped to its project.
 * GET /experiments/{id}?project_id={projectId}
 */
export function getExperiment(
  id: number,
  projectId: number,
): Promise<Experiment> {
  return apiClient.get<Experiment>(
    endpoints.experiments.detail(id, projectId),
  );
}

/**
 * Create a new experiment within an existing project.
 * POST /experiments/
 */
export function createExperiment(data: ExperimentCreate): Promise<Experiment> {
  return apiClient.post<Experiment>(endpoints.experiments.create(), data);
}

/**
 * Delete an experiment and all of its runs, scoped to its project.
 * DELETE /experiments/{id}?project_id={projectId}
 */
export function deleteExperiment(
  id: number,
  projectId: number,
): Promise<void> {
  return apiClient.del<void>(endpoints.experiments.delete(id, projectId));
}
