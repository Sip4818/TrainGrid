/**
 * Dataset mirrors the backend Dataset response schema.
 * 'store_key' is the artifact-store key (e.g. 'datasets/3/dataset.csv') that a
 * run config references via dataset_path; the worker materializes it to a real
 * file before training.
 */
export interface Dataset {
  id: number;
  name: string;
  size_bytes: number;
  store_key: string;
  created_at: string;
}