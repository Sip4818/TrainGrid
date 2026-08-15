import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Experiment, ExperimentCreate } from "./types";

/**
 * Fetch all experiments, optionally scoped to a single project.
 * GET /experiments/
 */
export function getExperiments(projectId?: number): Promise<Experiment[]> {
  return apiClient.get<Experiment[]>(endpoints.experiments.list(projectId));
}

/**
 * Fetch a single experiment by ID.
 * GET /experiments/{id}
 */
export function getExperiment(id: number): Promise<Experiment> {
  return apiClient.get<Experiment>(endpoints.experiments.detail(id));
}

/**
 * Create a new experiment within an existing project.
 * POST /experiments/
 */
export function createExperiment(data: ExperimentCreate): Promise<Experiment> {
  return apiClient.post<Experiment>(endpoints.experiments.create(), data);
}

/**
 * Delete an experiment and all of its runs.
 * DELETE /experiments/{id}
 */
export function deleteExperiment(id: number): Promise<void> {
  return apiClient.del<void>(endpoints.experiments.delete(id));
}
