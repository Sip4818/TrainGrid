import type { Experiment } from "../experiments/types";

/**
 * Project mirrors the backend Project response schema.
 * 'experiments' lists the experiments owned by this project for drill-down.
 */
export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  experiments: Experiment[];
}

/**
 * ProjectCreate is the request payload for POST /projects/.
 * Mirrors the backend ProjectCreate schema.
 */
export interface ProjectCreate {
  name: string;
  description?: string | null;
}
