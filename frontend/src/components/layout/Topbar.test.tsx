import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Topbar } from "./Topbar";

describe("Topbar", () => {
  it("renders the TrainGrid brand by default", () => {
    render(<Topbar />);
    expect(screen.getByText("TrainGrid")).toBeInTheDocument();
  });

  it("renders optional children actions", () => {
    render(
      <Topbar>
        <button>Action</button>
      </Topbar>,
    );
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("renders the header element", () => {
    const { container } = render(<Topbar />);
    expect(container.querySelector("header")).toBeInTheDocument();
  });
});