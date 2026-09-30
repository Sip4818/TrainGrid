import { useEffect, useRef } from "react";
import type { EpochPoint } from "../types";

const WIDTH = 400;
const HEIGHT = 200;
const PADDING = 28;

interface Series {
  key: "loss" | "val_loss";
  label: string;
  color: string;
}

const SERIES: Series[] = [
  { key: "loss", label: "loss", color: "#2563eb" },
  { key: "val_loss", label: "val_loss", color: "#d97706" },
];

/**
 * Live training curve: inline SVG polylines of loss/val_loss over epochs.
 * Only series with at least one value are drawn; scales derive from the
 * data present so partial streams (e.g. XGBoost's single point) render.
 */
function TrainingChart({ epochs }: { epochs: EpochPoint[] }): React.ReactElement {
  const maxEpoch = Math.max(
    ...epochs.map((p) => p.total_epochs),
    epochs.length,
    1,
  );
  const values = epochs.flatMap((p) =>
    [p.loss, p.val_loss].filter((v): v is number => v !== undefined),
  );
  const minY = values.length > 0 ? Math.min(...values) : 0;
  const maxY = values.length > 0 ? Math.max(...values) : 1;
  const span = maxY - minY || 1;

  const x = (epoch: number): number =>
    PADDING + ((epoch - 1) / Math.max(maxEpoch - 1, 1)) * (WIDTH - 2 * PADDING);
  const y = (value: number): number =>
    HEIGHT - PADDING - ((value - minY) / span) * (HEIGHT - 2 * PADDING);

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Live training loss curve"
      >
        {SERIES.map((series) => {
          const points = epochs.filter(
            (p) => p[series.key] !== undefined,
          );
          if (points.length === 0) {
            return null;
          }
          return (
            <g key={series.key}>
              <polyline
                points={points
                  .map((p) => `${x(p.epoch)},${y(p[series.key] as number)}`)
                  .join(" ")}
                fill="none"
                stroke={series.color}
                strokeWidth="2"
              />
              {points.map((p) => (
                <circle
                  key={p.epoch}
                  cx={x(p.epoch)}
                  cy={y(p[series.key] as number)}
                  r="3"
                  fill={series.color}
                />
              ))}
            </g>
          );
        })}
        <text x={PADDING} y={HEIGHT - 8} fontSize="10" fill="#6b7280">
          1
        </text>
        <text
          x={WIDTH - PADDING}
          y={HEIGHT - 8}
          fontSize="10"
          fill="#6b7280"
          textAnchor="end"
        >
          {maxEpoch}
        </text>
        <text x={4} y={PADDING} fontSize="10" fill="#6b7280">
          {maxY.toFixed(3)}
        </text>
        <text x={4} y={HEIGHT - PADDING} fontSize="10" fill="#6b7280">
          {minY.toFixed(3)}
        </text>
      </svg>
      <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
        {SERIES.map(
          (series) =>
            epochs.some((p) => p[series.key] !== undefined) && (
              <span
                key={series.key}
                style={{
                  fontSize: "12px",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "3px",
                    backgroundColor: series.color,
                  }}
                />
                {series.label}
              </span>
            ),
        )}
      </div>
    </div>
  );
}

/**
 * Scrolling terminal-style viewer for stream events. Pins to the
 * bottom as new lines arrive.
 */
function LogViewer({ logLines }: { logLines: string[] }): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logLines]);

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: "#111827",
        color: "#e5e7eb",
        borderRadius: "6px",
        padding: "12px 16px",
        fontFamily: "monospace",
        fontSize: "12px",
        lineHeight: "1.6",
        maxHeight: "220px",
        overflowY: "auto",
      }}
      role="log"
      aria-label="Live training log"
    >
      {logLines.length === 0 ? (
        <span style={{ color: "#6b7280" }}>Waiting for training events…</span>
      ) : (
        logLines.map((line, index) => <div key={index}>{line}</div>)
      )}
    </div>
  );
}

/**
 * Live training view: chart plus log, fed by useRunStream state.
 * Epoch history lives only in component state — a reload shows the
 * static final metrics instead (accepted scope of #89).
 */
export function LiveTrainingView({
  epochs,
  logLines,
}: {
  epochs: EpochPoint[];
  logLines: string[];
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <TrainingChart epochs={epochs} />
      <LogViewer logLines={logLines} />
    </div>
  );
}
