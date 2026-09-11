import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTrainers,
  listModels,
  getModel,
  listModelVersions,
  registerModel,
  promoteModel,
} from "./api";
import type {
  TrainerInfo,
  RegisteredModelSummary,
  RegisteredModel,
  ModelRegisterRequest,
  ModelStageUpdate,
} from "./types";

/**
 * Fetch all registered trainers with automatic caching.
 */
export function useTrainers() {
  return useQuery<TrainerInfo[]>({
    queryKey: ["trainers"],
    queryFn: getTrainers,
  });
}

/**
 * Fetch all registered models globally.
 */
export function useModels() {
  return useQuery<RegisteredModelSummary[]>({
    queryKey: ["models"],
    queryFn: listModels,
  });
}

/**
 * Fetch the latest version of a model by name.
 */
export function useModel(name: string) {
  return useQuery<RegisteredModel>({
    queryKey: ["model", name],
    queryFn: () => getModel(name),
    enabled: name.length > 0,
  });
}

/**
 * Fetch all versions of a model.
 */
export function useModelVersions(name: string) {
  return useQuery<RegisteredModel[]>({
    queryKey: ["modelVersions", name],
    queryFn: () => listModelVersions(name),
    enabled: name.length > 0,
  });
}

/**
 * Register a model and invalidate models list on success.
 */
export function useRegisterModel() {
  const queryClient = useQueryClient();
  return useMutation<RegisteredModel, Error, ModelRegisterRequest>({
    mutationFn: registerModel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

/**
 * Promote/demote a model version and invalidate queries on success.
 */
export function usePromoteModel() {
  const queryClient = useQueryClient();
  return useMutation<
    RegisteredModel,
    Error,
    { name: string; version: string; data: ModelStageUpdate }
  >({
    mutationFn: ({ name, version, data }) => promoteModel(name, version, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["models"] });
      void queryClient.invalidateQueries({ queryKey: ["model"] });
      void queryClient.invalidateQueries({ queryKey: ["modelVersions"] });
    },
  });
}
