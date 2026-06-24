import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select } from "./Select";

const options = [
  { value: "option1", label: "Option 1" },
  { value: "option2", label: "Option 2" },
  { value: "option3", label: "Option 3" },
];

describe("Select", () => {
  it("renders options", () => {
    render(<Select options={options} />);
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.getByText("Option 3")).toBeInTheDocument();
  });

  it("renders with a label", () => {
    render(<Select label="Model Type" options={options} />);
    expect(screen.getByLabelText("Model Type")).toBeInTheDocument();
  });

  it("calls onChange when selection changes", () => {
    const onChange = vi.fn();
    render(<Select options={options} onChange={onChange} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "option2" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reflects the selected value", () => {
    render(<Select options={options} value="option2" readOnly />);
    expect(screen.getByRole("combobox")).toHaveValue("option2");
  });

  it("renders with default empty state when options is empty", () => {
    render(<Select options={[]} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select.children).toHaveLength(0);
  });
});
