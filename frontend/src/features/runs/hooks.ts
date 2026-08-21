import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRuns, getRun, createRun, deleteRun, compareRuns } from "./api";
import type { Run, RunComparisonResponse, RunCreate } from "./types";
import { RunStatus } from "./types";

/**
 * Fetch all runs within a specific experiment.
 */
export function useRuns(projectId: number, experimentId: number) {
  return useQuery<Run[]>({
    queryKey: ["runs", projectId, experimentId],
    queryFn: () => getRuns(projectId, experimentId),
  });
}

/**
 * Fetch a single run by ID with auto-polling every 3 seconds
 * while the run is in PENDING or RUNNING status.
 */
export function useRun(id: number, projectId: number, experimentId: number) {
  return useQuery<Run>({
    queryKey: ["run", id, projectId, experimentId],
    queryFn: () => getRun(id, projectId, experimentId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        (data.status === RunStatus.PENDING ||
          data.status === RunStatus.RUNNING)
      ) {
        return 3000;
      }
      return false;
    },
  });
}

/**
 * Create a new run and invalidate all runs queries on success
 * so the UI updates immediately.
 */
export function useCreateRun() {
  const queryClient = useQueryClient();
  return useMutation<Run, Error, RunCreate>({
    mutationFn: createRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

/**
 * Delete a run and invalidate all runs queries on success.
 */
export function useDeleteRun() {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: number; projectId: number; experimentId: number }
  >({
    mutationFn: ({ id, projectId, experimentId }) =>
      deleteRun(id, projectId, experimentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

/**
 * Fetch the comparison matrix for the given runs within an experiment.
 * Only enabled when at least one run is selected.
 */
export function useRunComparison(
  projectId: number,
  experimentId: number,
  runIds: number[],
) {
  return useQuery<RunComparisonResponse>({
    queryKey: ["runs", "compare", projectId, experimentId, runIds],
    queryFn: () => compareRuns(projectId, experimentId, runIds),
    enabled: runIds.length > 0,
  });
}
