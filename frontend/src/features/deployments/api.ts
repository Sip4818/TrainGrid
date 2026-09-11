import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type {
  Deployment,
  DeploymentCreate,
  PredictRequest,
  PredictResponse,
} from "./types";

/**
 * Fetch all deployments.
 * GET /deployments/
 */
export function getDeployments(): Promise<Deployment[]> {
  return apiClient.get<Deployment[]>(endpoints.deployments.list());
}

/**
 * Fetch a single deployment by ID.
 * GET /deployments/{id}
 */
export function getDeployment(id: number): Promise<Deployment> {
  return apiClient.get<Deployment>(endpoints.deployments.detail(id));
}

/**
 * Deploy a registered model.
 * POST /deployments/
 */
export function deployModel(data: DeploymentCreate): Promise<Deployment> {
  return apiClient.post<Deployment>(endpoints.deployments.create(), data);
}

/**
 * Undeploy (stop) a deployment.
 * DELETE /deployments/{id}
 */
export function undeployModel(id: number): Promise<Deployment> {
  return apiClient.del<Deployment>(endpoints.deployments.delete(id));
}

/**
 * Run prediction on a specific deployment.
 * POST /deployments/{id}/predict
 */
export function predict(
  deploymentId: number,
  data: PredictRequest,
): Promise<PredictResponse> {
  return apiClient.post<PredictResponse>(
    endpoints.deployments.predict(deploymentId),
    data,
  );
}

/**
 * Run prediction using the latest deployment of a model (version-agnostic).
 * POST /models/{name}/predict
 */
export function predictByModelName(
  modelName: string,
  data: PredictRequest,
): Promise<PredictResponse> {
  return apiClient.post<PredictResponse>(
    endpoints.deployments.predictByName(modelName),
    data,
  );
}
