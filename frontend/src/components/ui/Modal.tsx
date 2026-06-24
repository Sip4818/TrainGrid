import type { ReactNode, MouseEvent } from "react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "24px",
  minWidth: "320px",
  maxWidth: "480px",
  width: "100%",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
  position: "relative",
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "12px",
  right: "12px",
  background: "none",
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  color: "#6b7280",
  lineHeight: 1,
  padding: "4px",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps): React.ReactElement | null {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div style={dialogStyle}>
        <button
          style={closeButtonStyle}
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>
        {title && (
          <h2
            style={{
              margin: 0,
              marginBottom: "16px",
              fontSize: "18px",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

