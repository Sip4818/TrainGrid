import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";
import { RunStatus } from "../../features/runs/types";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders with default variant when none provided", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("renders with PENDING variant", () => {
    render(<Badge variant={RunStatus.PENDING}>Pending</Badge>);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders with RUNNING variant", () => {
    render(<Badge variant={RunStatus.RUNNING}>Running</Badge>);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("renders with COMPLETED variant", () => {
    render(<Badge variant={RunStatus.COMPLETED}>Completed</Badge>);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders with FAILED variant", () => {
    render(<Badge variant={RunStatus.FAILED}>Failed</Badge>);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders with CANCELLED variant", () => {
    render(<Badge variant={RunStatus.CANCELLED}>Cancelled</Badge>);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});
