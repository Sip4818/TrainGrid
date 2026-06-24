import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({
  label,
  id,
  style,
  ...rest
}: InputProps): React.ReactElement {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          fontSize: "14px",
          outline: "none",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
          ...style,
        }}
        {...rest}
      />
    </div>
  );
}

