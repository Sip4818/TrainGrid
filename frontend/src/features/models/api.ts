import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { TrainerInfo } from "./types";

/**
 * Fetch all registered trainers.
 * GET /trainers/
 */
export function getTrainers(): Promise<TrainerInfo[]> {
  return apiClient.get<TrainerInfo[]>(endpoints.trainers.list());
}
