import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders with a label", () => {
    render(<Input label="Dataset Path" />);
    expect(screen.getByLabelText("Dataset Path")).toBeInTheDocument();
  });

  it("renders placeholder text", () => {
    render(<Input placeholder="Enter path" />);
    expect(screen.getByPlaceholderText("Enter path")).toBeInTheDocument();
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "new value" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwards value prop", () => {
    render(<Input value="test-value" readOnly />);
    expect(screen.getByRole("textbox")).toHaveValue("test-value");
  });
});
