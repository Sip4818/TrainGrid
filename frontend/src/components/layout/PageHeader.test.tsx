import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the required title", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<PageHeader title="Dashboard" description="Overview" />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("omits the description when not provided", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("invokes onClick when an action child is clicked", () => {
    const onClick = vi.fn();
    render(
      <PageHeader title="Dashboard">
        <button onClick={onClick}>Create Run</button>
      </PageHeader>,
    );
    fireEvent.click(screen.getByText("Create Run"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a div container", () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });
});