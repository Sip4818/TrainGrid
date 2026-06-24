import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "1px solid #1d4ed8",
  },
  secondary: {
    backgroundColor: "#6b7280",
    color: "#ffffff",
    border: "1px solid #4b5563",
  },
  danger: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "1px solid #b91c1c",
  },
};

const baseStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  outline: "none",
  transition: "opacity 0.2s",
};

export function Button({
  children,
  variant = "primary",
  disabled = false,
  style,
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <button
      disabled={disabled}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

