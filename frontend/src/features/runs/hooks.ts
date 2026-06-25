import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRuns, createRun } from "./api";
import type { Run, RunCreate } from "./types";

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
