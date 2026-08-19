import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDatasets, uploadDataset } from "./api";
import type { Dataset } from "./types";

/**
 * Fetch all uploaded datasets with automatic caching.
 */
export function useDatasets() {
  return useQuery<Dataset[]>({
    queryKey: ["datasets"],
    queryFn: listDatasets,
  });
}

/**
 * Upload a dataset and invalidate the datasets cache on success so the
 * picker in the create-run modal refreshes immediately.
 */
export function useUploadDataset() {
  const queryClient = useQueryClient();
  return useMutation<Dataset, Error, { file: File; name?: string }>({
    mutationFn: ({ file, name }) => uploadDataset(file, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
  });
}