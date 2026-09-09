import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDeployments,
  getDeployment,
  deployModel,
  undeployModel,
  predict,
  predictByModelName,
} from "./api";
import type {
  Deployment,
  DeploymentCreate,
  PredictRequest,
  PredictResponse,
} from "./types";

/**
 * Fetch all deployments for a project.
 */
export function useDeployments(projectId: number) {
  return useQuery<Deployment[]>({
    queryKey: ["deployments", projectId],
    queryFn: () => getDeployments(projectId),
  });
}

/**
 * Fetch a single deployment by ID, scoped to a project.
 */
export function useDeployment(id: number, projectId: number) {
  return useQuery<Deployment>({
    queryKey: ["deployment", id, projectId],
    queryFn: () => getDeployment(id, projectId),
  });
}

/**
 * Deploy a registered model and invalidate deployments list on success.
 */
export function useDeployModel() {
  const queryClient = useQueryClient();
  return useMutation<Deployment, Error, DeploymentCreate>({
    mutationFn: deployModel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

/**
 * Undeploy a model and invalidate deployments list on success.
 */
export function useUndeployModel() {
  const queryClient = useQueryClient();
  return useMutation<Deployment, Error, { id: number; projectId: number }>({
    mutationFn: ({ id, projectId }) => undeployModel(id, projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

/**
 * Run prediction on a specific deployment, scoped to a project.
 */
export function usePredict() {
  return useMutation<
    PredictResponse,
    Error,
    { deploymentId: number; data: PredictRequest; projectId: number }
  >({
    mutationFn: ({ deploymentId, data, projectId }) =>
      predict(deploymentId, data, projectId),
  });
}

/**
 * Run prediction using the latest deployment of a model, scoped to a project.
 */
export function usePredictByModelName() {
  return useMutation<
    PredictResponse,
    Error,
    { modelName: string; data: PredictRequest; projectId: number }
  >({
    mutationFn: ({ modelName, data, projectId }) =>
      predictByModelName(modelName, data, projectId),
  });
}
