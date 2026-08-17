import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExperiments,
  getExperiment,
  createExperiment,
  deleteExperiment,
} from "./api";
import type { Experiment, ExperimentCreate } from "./types";

/**
 * Fetch all experiments, optionally scoped to a project.
 * The query key includes the optional project id so each scope caches separately.
 */
export function useExperiments(projectId?: number) {
  return useQuery<Experiment[]>({
    queryKey:
      projectId !== undefined
        ? ["experiments", projectId]
        : ["experiments"],
    queryFn: () => getExperiments(projectId),
  });
}

/**
 * Fetch a single experiment by ID.
 */
export function useExperiment(id: number) {
  return useQuery<Experiment>({
    queryKey: ["experiment", id],
    queryFn: () => getExperiment(id),
  });
}

/**
 * Create a new experiment and invalidate experiments and projects queries
 * on success (projects nest experiments, so their lists change too).
 */
export function useCreateExperiment() {
  const queryClient = useQueryClient();
  return useMutation<Experiment, Error, ExperimentCreate>({
    mutationFn: createExperiment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experiments"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

/**
 * Delete an experiment and invalidate experiments and projects queries on success.
 */
export function useDeleteExperiment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteExperiment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experiments"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}
