import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRuns, getRun, createRun } from "./api";
import type { Run, RunCreate } from "./types";
import { RunStatus } from "./types";

/**
 * Fetch all runs with automatic caching and refetching.
 */
export function useRuns() {
  return useQuery<Run[]>({
    queryKey: ["runs"],
    queryFn: getRuns,
  });
}

/**
 * Fetch a single run by ID with auto-polling every 3 seconds
 * while the run is in PENDING or RUNNING status.
 */
export function useRun(id: number) {
  return useQuery<Run>({
    queryKey: ["run", id],
    queryFn: () => getRun(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        (data.status === RunStatus.PENDING ||
          data.status === RunStatus.RUNNING)
      ) {
        return 3000; // poll every 3s while active
      }
      return false; // stop polling when completed/failed/cancelled
    },
  });
}

/**
 * Create a new run and invalidate the runs list on success
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
