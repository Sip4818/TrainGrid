import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSweeps, getSweep, createSweep } from "./api";
import type { Sweep, SweepCreate } from "./types";
import { SweepStatus } from "./types";

/**
 * Fetch all hyperparameter sweeps within a specific experiment.
 * Auto-polls every 3 seconds while any sweep is still active so status
 * transitions (driven server-side by the Celery chord callback) appear
 * without a page reload. Mirrors useRun's polling behavior.
 */
export function useSweeps(projectId: number, experimentId: number) {
  return useQuery<Sweep[]>({
    queryKey: ["sweeps", projectId, experimentId],
    queryFn: () => listSweeps(projectId, experimentId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        data.some(
          (sweep) =>
            sweep.status === SweepStatus.PENDING ||
            sweep.status === SweepStatus.RUNNING,
        )
      ) {
        return 3000;
      }
      return false;
    },
  });
}

/**
 * Fetch a single hyperparameter sweep by ID, auto-polling every
 * 3 seconds while it is still active.
 */
export function useSweep(id: number, projectId: number, experimentId: number) {
  return useQuery<Sweep>({
    queryKey: ["sweep", id, projectId, experimentId],
    queryFn: () => getSweep(id, projectId, experimentId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        (data.status === SweepStatus.PENDING ||
          data.status === SweepStatus.RUNNING)
      ) {
        return 3000;
      }
      return false;
    },
  });
}

/**
 * Create a new hyperparameter sweep and invalidate all sweeps queries
 * on success so the UI updates immediately.
 */
export function useCreateSweep() {
  const queryClient = useQueryClient();
  return useMutation<Sweep, Error, SweepCreate>({
    mutationFn: createSweep,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sweeps"] });
    },
  });
}
