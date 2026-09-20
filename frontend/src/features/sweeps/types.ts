/**
 * SweepStatus mirrors the backend SweepStatus enum.
 */
export enum SweepStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * SearchStrategy mirrors the backend SearchStrategy enum.
 */
export enum SearchStrategy {
  GRID = "grid",
  RANDOM = "random",
}

/**
 * SweepGoal mirrors the backend SweepGoal enum.
 */
export enum SweepGoal {
  MAXIMIZE = "maximize",
  MINIMIZE = "minimize",
}

/**
 * Sweep is the full response for a hyperparameter sweep.
 * Mirrors the backend SweepResponse schema.
 */
export interface Sweep {
  id: number;
  project_id: number;
  experiment_id: number;
  trainer_name: string;
  dataset_path: string;
  target_column: string;
  feature_columns: string[];
  search_space: Record<string, unknown[]>;
  strategy: SearchStrategy;
  max_combinations: number | null;
  metric: string;
  goal: SweepGoal;
  status: SweepStatus;
  best_run_id: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  run_ids: number[];
}

/**
 * SweepCreate is the request payload for POST /sweeps/.
 */
export interface SweepCreate {
  project_id: number;
  experiment_id: number;
  trainer_name: string;
  dataset_path: string;
  target_column: string;
  feature_columns: string[];
  search_space: Record<string, unknown[]>;
  strategy: SearchStrategy;
  max_combinations?: number;
  metric?: string;
  goal?: SweepGoal;
}
