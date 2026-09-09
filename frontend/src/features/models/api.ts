import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type {
  TrainerInfo,
  RegisteredModelSummary,
  RegisteredModel,
  ModelRegisterRequest,
  ModelStageUpdate,
} from "./types";

/**
 * Fetch all registered trainers.
 * GET /trainers/
 */
export function getTrainers(): Promise<TrainerInfo[]> {
  return apiClient.get<TrainerInfo[]>(endpoints.trainers.list());
}

/**
 * Fetch all registered models for a project (latest version of each).
 * GET /models/?project_id={projectId}
 */
export function listModels(projectId: number): Promise<RegisteredModelSummary[]> {
  return apiClient.get<RegisteredModelSummary[]>(endpoints.models.list(projectId));
}

/**
 * Fetch the latest version of a model by name, scoped to a project.
 * GET /models/{name}?project_id={projectId}
 */
export function getModel(
  name: string,
  projectId: number,
): Promise<RegisteredModel> {
  return apiClient.get<RegisteredModel>(endpoints.models.detail(name, projectId));
}

/**
 * Fetch all versions of a model, scoped to a project.
 * GET /models/{name}/versions?project_id={projectId}
 */
export function listModelVersions(
  name: string,
  projectId: number,
): Promise<RegisteredModel[]> {
  return apiClient.get<RegisteredModel[]>(
    endpoints.models.versions(name, projectId),
  );
}

/**
 * Register a completed run as a new model version.
 * POST /models/
 */
export function registerModel(data: ModelRegisterRequest): Promise<RegisteredModel> {
  return apiClient.post<RegisteredModel>(endpoints.models.register(), data);
}

/**
 * Promote or demote a model version to a new stage.
 * POST /models/{name}/versions/{version}/promote
 */
export function promoteModel(
  name: string,
  version: string,
  data: ModelStageUpdate,
): Promise<RegisteredModel> {
  return apiClient.post<RegisteredModel>(
    endpoints.models.promote(name, version),
    data,
  );
}
