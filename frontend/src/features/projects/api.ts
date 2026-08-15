import { apiClient } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Project, ProjectCreate } from "./types";

/**
 * Fetch all projects.
 * GET /projects/
 */
export function getProjects(): Promise<Project[]> {
  return apiClient.get<Project[]>(endpoints.projects.list());
}

/**
 * Fetch a single project by ID.
 * GET /projects/{id}
 */
export function getProject(id: number): Promise<Project> {
  return apiClient.get<Project>(endpoints.projects.detail(id));
}

/**
 * Create a new project.
 * POST /projects/
 */
export function createProject(data: ProjectCreate): Promise<Project> {
  return apiClient.post<Project>(endpoints.projects.create(), data);
}

/**
 * Delete a project and all of its experiments and runs.
 * DELETE /projects/{id}
 */
export function deleteProject(id: number): Promise<void> {
  return apiClient.del<void>(endpoints.projects.delete(id));
}
