import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ConfigForm,
  buildConfigFromSchema,
  seedConfigFromSchema,
} from "./ConfigForm";
import type { JsonSchema, DatasetOption } from "./ConfigForm";

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

describe("ConfigForm dataset widget", () => {
  const datasetSchema: JsonSchema = {
    type: "object",
    properties: {
      dataset_path: {
        title: "Dataset Path",
        type: "string",
        x_widget: "dataset",
      },
      target_column: { title: "Target Column", type: "string" },
    },
    required: ["dataset_path", "target_column"],
  };

  const datasets: DatasetOption[] = [
    { store_key: "datasets/1/dataset.csv", name: "iris.csv" },
    { store_key: "datasets/2/dataset.csv", name: "titanic.csv" },
  ];

  const emptyValues = { dataset_path: "", target_column: "" };

  function StatefulConfigForm({
    initial,
    datasets: opts = datasets,
  }: {
    initial: Record<string, unknown>;
    datasets?: DatasetOption[];
  }): React.ReactElement {
    const [values, setValues] = useState(initial);
    return (
      <ConfigForm
        schema={datasetSchema}
        values={values}
        onChange={(key, value) =>
          setValues((prev) => ({ ...prev, [key]: value }))
        }
        datasets={opts}
      />
    );
  }

  it("renders a dataset picker with uploaded datasets and a custom path option", () => {
    render(
      <ConfigForm
        schema={datasetSchema}
        values={emptyValues}
        onChange={() => {}}
        datasets={datasets}
      />,
    );
    const select = screen.getByLabelText("Dataset Path");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByText("iris.csv")).toBeInTheDocument();
    expect(screen.getByText("titanic.csv")).toBeInTheDocument();
    expect(screen.getByText("Custom path\u2026")).toBeInTheDocument();
  });

  it("calls onChange with the store key when an uploaded dataset is selected", () => {
    const onChange = vi.fn();
    render(
      <ConfigForm
        schema={datasetSchema}
        values={emptyValues}
        onChange={onChange}
        datasets={datasets}
      />,
    );
    fireEvent.change(screen.getByLabelText("Dataset Path"), {
      target: { value: "datasets/2/dataset.csv" },
    });
    expect(onChange).toHaveBeenCalledWith(
      "dataset_path",
      "datasets/2/dataset.csv",
    );
  });

  it("shows the custom path input when the value is a literal path", () => {
    render(
      <ConfigForm
        schema={datasetSchema}
        values={{ dataset_path: "backend/datasets/sample.csv", target_column: "" }}
        onChange={() => {}}
        datasets={datasets}
      />,
    );
    const customInput = screen.getByLabelText("Dataset Path custom path");
    expect(customInput).toHaveValue("backend/datasets/sample.csv");
  });

  it("switches between an uploaded dataset and the custom path input", () => {
    render(
      <StatefulConfigForm
        initial={{ dataset_path: "datasets/1/dataset.csv", target_column: "" }}
      />,
    );
    expect(screen.queryByLabelText("Dataset Path custom path")).toBeNull();
    fireEvent.change(screen.getByLabelText("Dataset Path"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Dataset Path custom path")).toBeInTheDocument();
  });

  it("calls onChange with the literal path when typing in the custom input", () => {
    const onChange = vi.fn();
    render(
      <ConfigForm
        schema={datasetSchema}
        values={{ dataset_path: "backend/datasets/sample.csv", target_column: "" }}
        onChange={onChange}
        datasets={datasets}
      />,
    );
    fireEvent.change(screen.getByLabelText("Dataset Path custom path"), {
      target: { value: "backend/datasets/other.csv" },
    });
    expect(onChange).toHaveBeenCalledWith(
      "dataset_path",
      "backend/datasets/other.csv",
    );
  });

  it("calls onUploadDataset with the chosen file", () => {
    const onUpload = vi.fn();
    render(
      <ConfigForm
        schema={datasetSchema}
        values={emptyValues}
        onChange={() => {}}
        datasets={datasets}
        onUploadDataset={onUpload}
      />,
    );
    const file = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Dataset Path file input"), {
      target: { files: [file] },
    });
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("disables the upload button while an upload is in progress", () => {
    render(
      <ConfigForm
        schema={datasetSchema}
        values={emptyValues}
        onChange={() => {}}
        datasets={datasets}
        onUploadDataset={() => {}}
        isUploading
      />,
    );
    expect(screen.getByRole("button", { name: "Uploading\u2026" })).toBeDisabled();
  });

  it("shows a hint when no datasets exist and no custom path is set", () => {
    render(
      <ConfigForm
        schema={datasetSchema}
        values={emptyValues}
        onChange={() => {}}
        datasets={[]}
      />,
    );
    expect(
      screen.getByText(/No datasets uploaded yet/),
    ).toBeInTheDocument();
  });
});
