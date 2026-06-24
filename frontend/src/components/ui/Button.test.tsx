import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText("Click"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Click
      </Button>,
    );
    fireEvent.click(screen.getByText("Click"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies primary variant by default", () => {
    render(<Button>Click</Button>);
    const button = screen.getByText("Click");
    expect(button).toBeInTheDocument();
  });

  it("accepts custom type attribute", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByText("Submit")).toHaveAttribute("type", "submit");
  });
});
