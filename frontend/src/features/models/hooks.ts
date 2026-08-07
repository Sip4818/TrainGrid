import { useQuery } from "@tanstack/react-query";
import { getTrainers } from "./api";
import type { TrainerInfo } from "./types";

/**
 * Fetch all registered trainers with automatic caching.
 */
export function useTrainers() {
  return useQuery<TrainerInfo[]>({
    queryKey: ["trainers"],
    queryFn: getTrainers,
  });
}
