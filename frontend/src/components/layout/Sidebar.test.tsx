import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders children inside the sidebar", () => {
    render(
      <Sidebar>
        <a href="/">Home</a>
      </Sidebar>,
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("displays the TrainGrid brand", () => {
    render(<Sidebar />);
    expect(screen.getByText("TrainGrid")).toBeInTheDocument();
  });

  it("applies sidebar container styles", () => {
    const { container } = render(<Sidebar />);
    const aside = container.querySelector("aside");
    expect(aside).toBeInTheDocument();
  });
});