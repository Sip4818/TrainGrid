import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useRunStream } from "./hooks";

/**
 * Minimal EventSource stand-in: captures instances so tests can
 * push messages and failures deterministically.
 */
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((message: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }

  emit(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  fail(): void {
    this.onerror?.();
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal(
    "EventSource",
    MockEventSource as unknown as typeof EventSource,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useRunStream", () => {
  it("opens a scoped stream URL when enabled", async () => {
    const onActiveChange = vi.fn();

    renderHook(() => useRunStream(7, 1, 10, true, onActiveChange));

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    expect(MockEventSource.instances[0]!.url).toBe(
      "http://localhost:8000/runs/7/stream?project_id=1&experiment_id=10",
    );
    expect(onActiveChange).toHaveBeenCalledWith(true);
  });

  it("does not connect when disabled", () => {
    renderHook(() => useRunStream(7, 1, 10, false));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("accumulates epochs and log lines, closing on terminal status", async () => {
    const onActiveChange = vi.fn();
    const { result } = renderHook(() =>
      useRunStream(7, 1, 10, true, onActiveChange),
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0]!;

    act(() => {
      source.emit({ type: "epoch", epoch: 1, total_epochs: 2, loss: 0.5 });
    });
    await waitFor(() => expect(result.current.epochs).toHaveLength(1));
    expect(result.current.streaming).toBe(true);
    expect(result.current.logLines).toEqual(["epoch 1/2 loss=0.5000"]);

    act(() => {
      source.emit({ type: "status", status: "completed", metrics: {} });
    });
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(source.closed).toBe(true);
    expect(result.current.status).toBe("completed");
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
  });

  it("flags failure on connection error for polling fallback", async () => {
    const onActiveChange = vi.fn();
    const { result } = renderHook(() =>
      useRunStream(7, 1, 10, true, onActiveChange),
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    act(() => {
      MockEventSource.instances[0]!.fail();
    });

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.streaming).toBe(false);
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
  });

  it("ignores malformed messages", async () => {
    const { result } = renderHook(() => useRunStream(7, 1, 10, true));

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    act(() => {
      MockEventSource.instances[0]!.onmessage?.({ data: "not-json" });
    });

    expect(result.current.epochs).toHaveLength(0);
    expect(result.current.logLines).toHaveLength(0);
  });
});
