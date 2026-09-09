import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";
import { RunStatus } from "../../features/runs/types";
import { ModelStage } from "../../features/models/types";
import { DeploymentStatus } from "../../features/deployments/types";

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

  it("renders with ModelStage.NONE variant", () => {
    render(<Badge variant={ModelStage.NONE}>none</Badge>);
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("renders with ModelStage.STAGING variant", () => {
    render(<Badge variant={ModelStage.STAGING}>staging</Badge>);
    expect(screen.getByText("staging")).toBeInTheDocument();
  });

  it("renders with ModelStage.PRODUCTION variant", () => {
    render(<Badge variant={ModelStage.PRODUCTION}>production</Badge>);
    expect(screen.getByText("production")).toBeInTheDocument();
  });

  it("renders with ModelStage.ARCHIVED variant", () => {
    render(<Badge variant={ModelStage.ARCHIVED}>archived</Badge>);
    expect(screen.getByText("archived")).toBeInTheDocument();
  });

  it("renders with DeploymentStatus.PENDING variant", () => {
    render(<Badge variant={DeploymentStatus.PENDING}>pending</Badge>);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders with DeploymentStatus.ACTIVE variant", () => {
    render(<Badge variant={DeploymentStatus.ACTIVE}>active</Badge>);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders with DeploymentStatus.FAILED variant", () => {
    render(<Badge variant={DeploymentStatus.FAILED}>failed</Badge>);
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("renders with DeploymentStatus.STOPPED variant", () => {
    render(<Badge variant={DeploymentStatus.STOPPED}>stopped</Badge>);
    expect(screen.getByText("stopped")).toBeInTheDocument();
  });
});
