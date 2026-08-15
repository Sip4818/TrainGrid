import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjects, getProject, createProject, deleteProject } from "./api";
import type { Project, ProjectCreate } from "./types";

/**
 * Fetch all projects with automatic caching and refetching.
 */
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: getProjects,
  });
}

/**
 * Fetch a single project by ID.
 */
export function useProject(id: number) {
  return useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
  });
}

/**
 * Create a new project and invalidate the projects queries on success
 * so the list and detail views update immediately.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, ProjectCreate>({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

/**
 * Delete a project and invalidate the projects queries on success.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}
