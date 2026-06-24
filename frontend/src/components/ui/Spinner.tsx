import type { CSSProperties } from "react";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 32,
  lg: 48,
};

const keyframeId = "tg-spinner-animation";

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById(keyframeId)) {
  const style = document.createElement("style");
  style.id = keyframeId;
  style.textContent = `
    @keyframes tg-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export function Spinner({ size = "md" }: SpinnerProps): React.ReactElement {
  const px = sizeMap[size];
  const style: CSSProperties = {
    width: px,
    height: px,
    border: "3px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "tg-spin 0.6s linear infinite",
    display: "inline-block",
    boxSizing: "border-box",
  };

  return <span style={style} role="status" aria-label="Loading" />;
}

