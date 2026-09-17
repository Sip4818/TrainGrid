/**
 * TrainerInfo mirrors the backend GET /trainers response.
 * config_schema is the JSON Schema of the trainer's Pydantic config class.
 */
export interface TrainerInfo {
  name: string;
  label: string;
  config_schema: Record<string, unknown>;
}

/**
 * ModelStage mirrors the backend ModelStage enum.
 */
export enum ModelStage {
  NONE = "none",
  STAGING = "staging",
  PRODUCTION = "production",
  ARCHIVED = "archived",
}

/**
 * RegisteredModelSummary is the lightweight response for list views.
 * Mirrors the backend RegisteredModelSummary schema.
 */
export interface RegisteredModelSummary {
  id: number;
  name: string;
  version: string;
  stage: ModelStage;
  metrics: Record<string, unknown>;
  created_at: string;
}

/**
 * RegisteredModel is the full response for a registered model version.
 * Mirrors the backend RegisteredModelResponse schema.
 */
export interface RegisteredModel {
  id: number;
  name: string;
  version: string;
  run_id: number;
  project_id: number;
  experiment_id: number;
  stage: ModelStage;
  description: string | null;
  artifact_path: string;
  artifact_checksum: string | null;
  dataset_hash: string | null;
  config: Record<string, unknown>;
  metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  /**
   * Legal stage transitions from the current stage.
   * Provided by the backend (STAGE_TRANSITIONS); the UI renders
   * one action button per entry instead of guessing legality.
   */
  allowed_stages: ModelStage[];
}

/**
 * ModelRegisterRequest is the request payload for POST /models/.
 */
export interface ModelRegisterRequest {
  name: string;
  version: string;
  run_id: number;
  description?: string;
}

/**
 * ModelStageUpdate is the request payload for stage transitions.
 */
export interface ModelStageUpdate {
  stage: ModelStage;
}
