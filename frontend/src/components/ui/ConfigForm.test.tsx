import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ConfigForm,
  buildConfigFromSchema,
  seedConfigFromSchema,
} from "./ConfigForm";
import type { JsonSchema } from "./ConfigForm";

const schema: JsonSchema = {
  type: "object",
  properties: {
    target_column: { title: "Target Column", type: "string" },
    feature_columns: {
      title: "Feature Columns",
      type: "array",
      items: { type: "string" },
    },
    n_estimators: { title: "N Estimators", type: "integer", default: 100 },
    max_depth: { title: "Max Depth", type: "integer", default: 6 },
    learning_rate: { title: "Learning Rate", type: "number", default: 0.3 },
    scale: { title: "Scale", type: "boolean", default: false },
    tree_method: {
      title: "Tree Method",
      type: "string",
      enum: ["hist", "exact"],
      default: "hist",
    },
  },
  required: ["target_column", "feature_columns"],
};

describe("ConfigForm", () => {
  it("renders a text input for string fields", () => {
    render(<ConfigForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByLabelText("Target Column")).toBeInTheDocument();
    expect(screen.getByLabelText("Target Column")).toHaveAttribute("type", "text");
  });

  it("renders number inputs for integer and number fields", () => {
    render(<ConfigForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByLabelText("N Estimators")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("N Estimators")).toHaveAttribute("step", "1");
    expect(screen.getByLabelText("Learning Rate")).toHaveAttribute("type", "number");
  });

  it("renders a comma-separated input for array fields", () => {
    render(
      <ConfigForm
        schema={schema}
        values={{ feature_columns: "a, b" }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Feature Columns")).toHaveValue("a, b");
  });

  it("renders a select for enum fields", () => {
    render(<ConfigForm schema={schema} values={{}} onChange={() => {}} />);
    const select = screen.getByLabelText("Tree Method");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByText("hist")).toBeInTheDocument();
    expect(screen.getByText("exact")).toBeInTheDocument();
  });

  it("renders a checkbox for boolean fields", () => {
    render(
      <ConfigForm schema={schema} values={{ scale: true }} onChange={() => {}} />,
    );
    expect(screen.getByLabelText("Scale")).toBeChecked();
  });

  it("marks required fields as required", () => {
    render(<ConfigForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByLabelText("Target Column")).toBeRequired();
    expect(screen.getByLabelText("Feature Columns")).toBeRequired();
    expect(screen.getByLabelText("N Estimators")).not.toBeRequired();
  });

  it("calls onChange when an input changes", () => {
    const onChange = vi.fn();
    render(<ConfigForm schema={schema} values={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("N Estimators"), {
      target: { value: "200" },
    });
    expect(onChange).toHaveBeenCalledWith("n_estimators", "200");
  });

  it("renders nothing for an empty schema", () => {
    const { container } = render(
      <ConfigForm schema={{ type: "object" }} values={{}} onChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("seedConfigFromSchema", () => {
  it("seeds defaults and empty values for required fields", () => {
    expect(seedConfigFromSchema(schema)).toEqual({
      target_column: "",
      feature_columns: "",
      n_estimators: "100",
      max_depth: "6",
      learning_rate: "0.3",
      scale: false,
      tree_method: "hist",
    });
  });
});

describe("buildConfigFromSchema", () => {
  it("coerces numbers, splits arrays, and keeps booleans", () => {
    const config = buildConfigFromSchema(
      {
        target_column: "target",
        feature_columns: "a, b, c",
        n_estimators: "200",
        max_depth: "10",
        learning_rate: "0.1",
        scale: true,
        tree_method: "hist",
      },
      schema,
    );
    expect(config).toEqual({
      target_column: "target",
      feature_columns: ["a", "b", "c"],
      n_estimators: 200,
      max_depth: 10,
      learning_rate: 0.1,
      scale: true,
      tree_method: "hist",
    });
  });

  it("omits empty optional fields so Pydantic defaults apply", () => {
    const config = buildConfigFromSchema(
      {
        target_column: "target",
        feature_columns: "a",
        n_estimators: "",
        max_depth: "",
        learning_rate: "",
        scale: false,
        tree_method: "hist",
      },
      schema,
    );
    expect(config).toEqual({
      target_column: "target",
      feature_columns: ["a"],
      scale: false,
      tree_method: "hist",
    });
  });
});
