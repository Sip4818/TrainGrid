/**
 * TrainerInfo mirrors the backend GET /trainers response.
 * config_schema is the JSON Schema of the trainer's Pydantic config class.
 */
export interface TrainerInfo {
  name: string;
  label: string;
  config_schema: Record<string, unknown>;
}
