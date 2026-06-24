import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export function Select({
  label,
  options,
  id,
  style,
  ...rest
}: SelectProps): React.ReactElement {
  const selectId =
    id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          fontSize: "14px",
          backgroundColor: "#ffffff",
          outline: "none",
          cursor: "pointer",
          boxSizing: "border-box",
          ...style,
        }}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

