/**
 * DeploymentStatus mirrors the backend DeploymentStatus enum.
 */
export enum DeploymentStatus {
  PENDING = "pending",
  ACTIVE = "active",
  FAILED = "failed",
  STOPPED = "stopped",
}

/**
 * Deployment is the full response object returned by the API.
 * Mirrors the backend DeploymentResponse schema.
 */
export interface Deployment {
  id: number;
  model_name: string;
  model_version: string;
  registered_model_id: number;
  status: DeploymentStatus;
  created_at: string;
  started_at: string | null;
  stopped_at: string | null;
}

/**
 * DeploymentCreate is the request payload for POST /deployments/.
 */
export interface DeploymentCreate {
  model_name: string;
  model_version: string;
}

/**
 * PredictionItem is a single prediction result.
 */
export interface PredictionItem {
  prediction: unknown;
  confidence: number | null;
}

/**
 * PredictRequest is the request payload for prediction endpoints.
 */
export interface PredictRequest {
  features: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * PredictResponse is the response from a prediction endpoint.
 */
export interface PredictResponse {
  predictions: PredictionItem[];
  latency_ms: number;
  model: string;
}
