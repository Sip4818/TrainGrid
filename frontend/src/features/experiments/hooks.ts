import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExperiments,
  getExperiment,
  createExperiment,
  deleteExperiment,
} from "./api";
import type { Experiment, ExperimentCreate } from "./types";

/**
 * Fetch all experiments within a project.
 * The query key includes the project id so each scope caches separately.
 */
export function useExperiments(projectId: number) {
  return useQuery<Experiment[]>({
    queryKey: ["experiments", projectId],
    queryFn: () => getExperiments(projectId),
  });
}

/**
 * Fetch a single experiment by ID, scoped to its project.
 */
export function useExperiment(id: number, projectId: number) {
  return useQuery<Experiment>({
    queryKey: ["experiment", id, projectId],
    queryFn: () => getExperiment(id, projectId),
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
 * Mutation input: { id, projectId } — both required for the scoped API.
 */
export function useDeleteExperiment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: number; projectId: number }>({
    mutationFn: ({ id, projectId }) => deleteExperiment(id, projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experiments"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}
