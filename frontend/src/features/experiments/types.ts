/**
 * Experiment mirrors the backend Experiment response schema.
 * 'run_count' is the number of training runs owned by this experiment.
 */
export interface Experiment {
  id: number;
  project_id: number;
  name: string;
  created_at: string;
  run_count: number;
}

/**
 * ExperimentCreate is the request payload for POST /experiments/.
 * Mirrors the backend ExperimentCreate schema.
 */
export interface ExperimentCreate {
  project_id: number;
  name: string;
}
