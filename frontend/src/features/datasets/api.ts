import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Dataset } from "./types";

/**
 * List all uploaded datasets.
 * GET /datasets/
 */
export function listDatasets(): Promise<Dataset[]> {
  return apiClient.get<Dataset[]>(endpoints.datasets.list());
}

/**
 * Upload a CSV dataset. The file is sent as multipart/form-data.
 * POST /datasets/
 */
export function uploadDataset(file: File, name?: string): Promise<Dataset> {
  const formData = new FormData();
  formData.append("file", file);
  if (name !== undefined && name !== "") {
    formData.append("name", name);
  }
  return apiClient.post<Dataset>(endpoints.datasets.upload(), formData);
}