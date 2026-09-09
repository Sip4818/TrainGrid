import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type {
  Deployment,
  DeploymentCreate,
  PredictRequest,
  PredictResponse,
} from "./types";

/**
 * Fetch all deployments for a project.
 * GET /deployments/?project_id={projectId}
 */
export function getDeployments(projectId: number): Promise<Deployment[]> {
  return apiClient.get<Deployment[]>(endpoints.deployments.list(projectId));
}

/**
 * Fetch a single deployment by ID, scoped to a project.
 * GET /deployments/{id}?project_id={projectId}
 */
export function getDeployment(
  id: number,
  projectId: number,
): Promise<Deployment> {
  return apiClient.get<Deployment>(endpoints.deployments.detail(id, projectId));
}

/**
 * Deploy a registered model.
 * POST /deployments/
 */
export function deployModel(data: DeploymentCreate): Promise<Deployment> {
  return apiClient.post<Deployment>(endpoints.deployments.create(), data);
}

/**
 * Undeploy (stop) a deployment, scoped to a project.
 * DELETE /deployments/{id}?project_id={projectId}
 */
export function undeployModel(
  id: number,
  projectId: number,
): Promise<Deployment> {
  return apiClient.del<Deployment>(endpoints.deployments.delete(id, projectId));
}

/**
 * Run prediction on a specific deployment, scoped to a project.
 * POST /deployments/{id}/predict?project_id={projectId}
 */
export function predict(
  deploymentId: number,
  data: PredictRequest,
  projectId: number,
): Promise<PredictResponse> {
  return apiClient.post<PredictResponse>(
    endpoints.deployments.predict(deploymentId, projectId),
    data,
  );
}

/**
 * Run prediction using the latest deployment of a model (version-agnostic), scoped to a project.
 * POST /models/{name}/predict?project_id={projectId}
 */
export function predictByModelName(
  modelName: string,
  data: PredictRequest,
  projectId: number,
): Promise<PredictResponse> {
  return apiClient.post<PredictResponse>(
    endpoints.deployments.predictByName(modelName, projectId),
    data,
  );
}
