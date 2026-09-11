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
 * Fetch all deployments.
 */
export function useDeployments() {
  return useQuery<Deployment[]>({
    queryKey: ["deployments"],
    queryFn: () => getDeployments(),
  });
}

/**
 * Fetch a single deployment by ID.
 */
export function useDeployment(id: number) {
  return useQuery<Deployment>({
    queryKey: ["deployment", id],
    queryFn: () => getDeployment(id),
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
  return useMutation<Deployment, Error, { id: number }>({
    mutationFn: ({ id }) => undeployModel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

/**
 * Run prediction on a specific deployment.
 */
export function usePredict() {
  return useMutation<
    PredictResponse,
    Error,
    { deploymentId: number; data: PredictRequest }
  >({
    mutationFn: ({ deploymentId, data }) => predict(deploymentId, data),
  });
}

/**
 * Run prediction using the latest deployment of a model.
 */
export function usePredictByModelName() {
  return useMutation<
    PredictResponse,
    Error,
    { modelName: string; data: PredictRequest }
  >({
    mutationFn: ({ modelName, data }) => predictByModelName(modelName, data),
  });
}
