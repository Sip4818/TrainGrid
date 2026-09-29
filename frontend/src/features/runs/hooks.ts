import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { getRuns, getRun, createRun, deleteRun, compareRuns } from "./api";
import type {
  EpochPoint,
  Run,
  RunComparisonResponse,
  RunCreate,
  TrainingEvent,
} from "./types";
import { RunStatus } from "./types";

/**
 * Fetch all runs within a specific experiment.
 */
export function useRuns(projectId: number, experimentId: number) {
  return useQuery<Run[]>({
    queryKey: ["runs", projectId, experimentId],
    queryFn: () => getRuns(projectId, experimentId),
  });
}

/**
 * Fetch a single run by ID with auto-polling every 3 seconds
 * while the run is in PENDING or RUNNING status.
 * Polling can be suspended via options (e.g. while the SSE
 * live stream owns updates).
 */
export function useRun(
  id: number,
  projectId: number,
  experimentId: number,
  options?: { disablePolling?: boolean },
) {
  return useQuery<Run>({
    queryKey: ["run", id, projectId, experimentId],
    queryFn: () => getRun(id, projectId, experimentId),
    refetchInterval: (query) => {
      if (options?.disablePolling) {
        return false;
      }
      const data = query.state.data;
      if (
        data &&
        (data.status === RunStatus.PENDING ||
          data.status === RunStatus.RUNNING)
      ) {
        return 3000;
      }
      return false;
    },
  });
}

/**
 * Statuses that keep the live stream open. Anything else is terminal
 * and closes the connection.
 */
const TERMINAL_STATUSES: RunStatus[] = [
  RunStatus.COMPLETED,
  RunStatus.FAILED,
  RunStatus.CANCELLED,
];

/**
 * Whether a run status warrants a live stream connection.
 */
export function isLiveStatus(status: RunStatus | undefined): boolean {
  return status === RunStatus.PENDING || status === RunStatus.RUNNING;
}

/**
 * Live stream state accumulated from SSE training events.
 */
export interface RunStream {
  /** Per-epoch points for the training curve, in arrival order. */
  epochs: EpochPoint[];
  /** Human-readable log lines, in arrival order. */
  logLines: string[];
  /** Latest status seen on the stream (starts as null). */
  status: RunStatus | null;
  /** True while the EventSource connection is open. */
  streaming: boolean;
  /** True once the stream errors — callers fall back to polling. */
  failed: boolean;
}

function formatEvent(event: TrainingEvent): string {
  if (event.type === "epoch") {
    const parts = [`epoch ${event.epoch}/${event.total_epochs}`];
    if (event.loss !== undefined) parts.push(`loss=${event.loss.toFixed(4)}`);
    if (event.val_loss !== undefined)
      parts.push(`val_loss=${event.val_loss.toFixed(4)}`);
    if (event.accuracy !== undefined)
      parts.push(`accuracy=${event.accuracy.toFixed(4)}`);
    return parts.join(" ");
  }
  const metrics = event.metrics ? ` ${JSON.stringify(event.metrics)}` : "";
  const error = event.error ? ` error=${event.error}` : "";
  return `status=${event.status}${metrics}${error}`;
}

/**
 * Subscribe to live training events for a run via Server-Sent Events.
 *
 * Opens an EventSource while `enabled` (the run is PENDING/RUNNING),
 * accumulates epoch points and log lines, and closes on terminal status,
 * error, unmount, or `enabled` flipping false. Reports liveness through
 * `onActiveChange` (must be a stable callback) so callers can suspend
 * the legacy polling in `useRun` while the stream owns updates.
 */
export function useRunStream(
  id: number,
  projectId: number,
  experimentId: number,
  enabled: boolean,
  onActiveChange?: (active: boolean) => void,
): RunStream {
  const [epochs, setEpochs] = useState<EpochPoint[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (typeof EventSource === "undefined") {
      setFailed(true);
      onActiveChange?.(false);
      return;
    }
    const source = new EventSource(
      apiUrl(endpoints.runs.stream(id, projectId, experimentId)),
    );
    setStreaming(true);
    onActiveChange?.(true);

    source.onmessage = (message: MessageEvent) => {
      let event: TrainingEvent;
      try {
        event = JSON.parse(message.data) as TrainingEvent;
      } catch {
        return;
      }
      setLogLines((prev) => [...prev, formatEvent(event)]);
      if (event.type === "epoch") {
        setEpochs((prev) => [
          ...prev,
          {
            epoch: event.epoch,
            total_epochs: event.total_epochs,
            loss: event.loss,
            val_loss: event.val_loss,
            accuracy: event.accuracy,
          },
        ]);
      } else {
        setStatus(event.status);
        if (TERMINAL_STATUSES.includes(event.status)) {
          source.close();
          setStreaming(false);
          onActiveChange?.(false);
        }
      }
    };
    source.onerror = () => {
      source.close();
      setStreaming(false);
      setFailed(true);
      onActiveChange?.(false);
    };
    return () => {
      source.close();
      setStreaming(false);
      onActiveChange?.(false);
    };
  }, [enabled, id, projectId, experimentId, onActiveChange]);

  return { epochs, logLines, status, streaming, failed };
}

/**
 * Create a new run and invalidate all runs queries on success
 * so the UI updates immediately.
 */
export function useCreateRun() {
  const queryClient = useQueryClient();
  return useMutation<Run, Error, RunCreate>({
    mutationFn: createRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

/**
 * Delete a run and invalidate all runs queries on success.
 */
export function useDeleteRun() {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: number; projectId: number; experimentId: number }
  >({
    mutationFn: ({ id, projectId, experimentId }) =>
      deleteRun(id, projectId, experimentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

/**
 * Fetch the comparison matrix for the given runs within an experiment.
 * Only enabled when at least one run is selected.
 */
export function useRunComparison(
  projectId: number,
  experimentId: number,
  runIds: number[],
) {
  return useQuery<RunComparisonResponse>({
    queryKey: ["runs", "compare", projectId, experimentId, runIds],
    queryFn: () => compareRuns(projectId, experimentId, runIds),
    enabled: runIds.length > 0,
  });
}
