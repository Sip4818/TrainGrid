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
 * Fetch all registered models globally (latest version of each).
 * GET /models/
 */
export function listModels(): Promise<RegisteredModelSummary[]> {
  return apiClient.get<RegisteredModelSummary[]>(endpoints.models.list());
}

/**
 * Fetch the latest version of a model by name.
 * GET /models/{name}
 */
export function getModel(name: string): Promise<RegisteredModel> {
  return apiClient.get<RegisteredModel>(endpoints.models.detail(name));
}

/**
 * Fetch all versions of a model.
 * GET /models/{name}/versions
 */
export function listModelVersions(name: string): Promise<RegisteredModel[]> {
  return apiClient.get<RegisteredModel[]>(endpoints.models.versions(name));
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
