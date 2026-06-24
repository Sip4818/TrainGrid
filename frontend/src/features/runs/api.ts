import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Run, RunCreate } from "./types";

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

