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
  learning_rate?: number;
  [key: string]: unknown;
}

/**
 * RunCreate is the request payload for POST /runs/.
 * Mirrors the backend RunCreate schema.
 */
export interface RunCreate {
  project_id: number;
  experiment_id: number;
  trainer_name: string;
  config: RunConfig;
}

/**
 * Run is the full response object returned by the API.
 * Mirrors the backend Run (response) schema.
 */
export interface Run {
  id: number;
  project_id: number;
  experiment_id: number;
  config: RunConfig;
  status: RunStatus;
  metrics: Record<string, unknown>;
  artifact_path: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

/**
 * EpochPoint is one plotted point of the live training curve.
 * Fields are optional because trainers report what they can:
 * PyTorch sends loss/val_loss per epoch, XGBoost a single accuracy point.
 */
export interface EpochPoint {
  epoch: number;
  total_epochs: number;
  loss?: number;
  val_loss?: number;
  accuracy?: number;
}

/**
 * EpochEvent carries per-epoch training metrics from the worker.
 * Mirrors the Layer 1 trainer callback payload.
 */
export interface EpochEvent {
  type: "epoch";
  epoch: number;
  total_epochs: number;
  loss?: number;
  val_loss?: number;
  accuracy?: number;
}

/**
 * StatusEvent carries run lifecycle changes from the Celery task.
 * Mirrors the Layer 2 lifecycle publishes.
 */
export interface StatusEvent {
  type: "status";
  status: RunStatus;
  metrics?: Record<string, unknown>;
  error?: string;
}

/**
 * TrainingEvent is any message received on the SSE run stream.
 */
export type TrainingEvent = EpochEvent | StatusEvent;

/**
 * RunComparisonItem is one run's entry in the comparison matrix.
 * Mirrors the backend RunComparisonItem schema.
 */
export interface RunComparisonItem {
  id: number;
  project_id: number;
  experiment_id: number;
  trainer_name: string;
  status: RunStatus;
  config: RunConfig;
  metrics: Record<string, unknown>;
}

/**
 * RunComparisonResponse is the payload from GET /runs/compare.
 * 'runs' holds one entry per requested run; 'metrics' is the ordered union of
 * metric keys across all compared runs, rendered as table rows.
 * Mirrors the backend RunComparisonResponse schema.
 */
export interface RunComparisonResponse {
  runs: RunComparisonItem[];
  metrics: string[];
}

