/**
 * RunStatus mirrors the backend RunStatus enum.
 */
export enum RunStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * RunConfig is the flexible dictionary of hyperparameters and dataset
 * configuration sent from the frontend. Maps to the backend `config: dict[str, Any]`.
 */
export interface RunConfig {
  dataset_path: string;
  target_column: string;
  feature_columns: string[];
  n_estimators?: number;
  max_depth?: number | null;
  [key: string]: unknown;
}

/**
 * RunCreate is the request payload for POST /runs/.
 * Mirrors the backend RunCreate schema.
 */
export interface RunCreate {
  experiment_id: number;
  config: RunConfig;
}

/**
 * Run is the full response object returned by the API.
 * Mirrors the backend Run (response) schema.
 */
export interface Run {
  id: number;
  experiment_id: number;
  config: RunConfig;
  status: RunStatus;
  metrics: Record<string, unknown>;
  artifact_path: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

