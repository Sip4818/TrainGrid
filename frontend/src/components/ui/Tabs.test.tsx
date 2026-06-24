import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs";

const tabs = [
  { id: "tab1", label: "Overview" },
  { id: "tab2", label: "Metrics" },
  { id: "tab3", label: "Logs" },
];

describe("Tabs", () => {
  it("renders all tab labels", () => {
    render(
      <Tabs tabs={tabs} activeTab="tab1" onChange={() => {}}>
        <p>Tab content</p>
      </Tabs>,
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Metrics")).toBeInTheDocument();
    expect(screen.getByText("Logs")).toBeInTheDocument();
  });

  it("renders children as tab panel", () => {
    render(
      <Tabs tabs={tabs} activeTab="tab1" onChange={() => {}}>
        <span data-testid="panel">Panel content</span>
      </Tabs>,
    );
    expect(screen.getByTestId("panel")).toBeInTheDocument();
  });

  it("calls onChange when a tab is clicked", () => {
    const onChange = vi.fn();
    render(
      <Tabs tabs={tabs} activeTab="tab1" onChange={onChange}>
        <p>Content</p>
      </Tabs>,
    );
    fireEvent.click(screen.getByText("Metrics"));
    expect(onChange).toHaveBeenCalledWith("tab2");
  });

  it("marks the activeTab as aria-selected=true", () => {
    render(
      <Tabs tabs={tabs} activeTab="tab2" onChange={() => {}}>
        <p>Content</p>
      </Tabs>,
    );
    expect(screen.getByText("Metrics")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Overview")).toHaveAttribute("aria-selected", "false");
  });
});
