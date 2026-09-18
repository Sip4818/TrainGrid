import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  SearchSpaceEditor,
  parseSearchValues,
  getSearchSpaceErrors,
  buildSearchSpace,
  tunableFields,
} from "./SearchSpaceEditor";
import type { JsonSchema } from "../../../components/ui/ConfigForm";

const schema: JsonSchema = {
  type: "object",
  properties: {
    dataset_path: { type: "string", title: "Dataset path" },
    target_column: { type: "string" },
    feature_columns: { type: "array", items: { type: "string" } },
    n_estimators: { type: "integer", default: 100 },
    learning_rate: { type: "number", default: 0.3 },
    optimizer: { type: "string", default: "adam" },
    hidden_dims: { type: "array", items: { type: "integer" } },
    checkpoint_enabled: { type: "boolean", default: true },
  },
  required: ["dataset_path", "target_column", "feature_columns"],
};

describe("tunableFields", () => {
  it("excludes dataset plumbing fields", () => {
    const names = tunableFields(schema).map((f) => f.name);
    expect(names).not.toContain("dataset_path");
    expect(names).not.toContain("target_column");
    expect(names).not.toContain("feature_columns");
    expect(names).toContain("n_estimators");
    expect(names).toContain("learning_rate");
    expect(names).toContain("hidden_dims");
  });
});

describe("parseSearchValues", () => {
  it("parses comma-separated integers", () => {
    expect(
      parseSearchValues("100, 200,300", { type: "integer" }),
    ).toEqual({ values: [100, 200, 300] });
  });

  it("parses floats", () => {
    expect(parseSearchValues("0.01, 0.1", { type: "number" })).toEqual({
      values: [0.01, 0.1],
    });
  });

  it("keeps strings as-is", () => {
    expect(parseSearchValues("adam, sgd", { type: "string" })).toEqual({
      values: ["adam", "sgd"],
    });
  });

  it("parses booleans case-insensitively", () => {
    expect(parseSearchValues("True, FALSE", { type: "boolean" })).toEqual({
      values: [true, false],
    });
  });

  it("rejects non-integers for integer fields", () => {
    const { error } = parseSearchValues("100, 1.5", { type: "integer" });
    expect(error).toMatch(/not an integer/);
  });

  it("rejects non-numbers for number fields", () => {
    const { error } = parseSearchValues("abc", { type: "number" });
    expect(error).toMatch(/not a number/);
  });

  it("rejects invalid booleans", () => {
    const { error } = parseSearchValues("yes", { type: "boolean" });
    expect(error).toMatch(/true or false/);
  });

  it("rejects empty input", () => {
    const { error } = parseSearchValues("  , ", { type: "integer" });
    expect(error).toMatch(/at least one/);
  });

  it("parses JSON arrays for array-typed fields", () => {
    expect(
      parseSearchValues("[[128, 64], [256, 128]]", {
        type: "array",
        items: { type: "integer" },
      }),
    ).toEqual({ values: [[128, 64], [256, 128]] });
  });

  it("rejects invalid JSON for array-typed fields", () => {
    const { error } = parseSearchValues("128, 64", {
      type: "array",
      items: { type: "integer" },
    });
    expect(error).toMatch(/JSON array/);
  });

  it("rejects values outside enum", () => {
    const { error } = parseSearchValues("adam, rmsprop", {
      type: "string",
      enum: ["adam", "sgd"],
    });
    expect(error).toMatch(/not one of/);
  });
});

describe("getSearchSpaceErrors and buildSearchSpace", () => {
  const valid = {
    n_estimators: "100, 200",
    learning_rate: "0.01",
    optimizer: "adam",
    hidden_dims: "[[128, 64]]",
    checkpoint_enabled: "true",
  };

  it("returns no errors for valid input", () => {
    expect(getSearchSpaceErrors(valid, schema)).toEqual({});
  });

  it("reports per-field errors", () => {
    const errors = getSearchSpaceErrors(
      { ...valid, n_estimators: "abc" },
      schema,
    );
    expect(Object.keys(errors)).toEqual(["n_estimators"]);
  });

  it("builds the payload from valid input", () => {
    expect(buildSearchSpace(valid, schema)).toEqual({
      n_estimators: [100, 200],
      learning_rate: [0.01],
      optimizer: ["adam"],
      hidden_dims: [[128, 64]],
      checkpoint_enabled: [true],
    });
  });

  it("returns undefined when any field is invalid", () => {
    expect(
      buildSearchSpace({ ...valid, learning_rate: "fast" }, schema),
    ).toBeUndefined();
  });
});

describe("SearchSpaceEditor", () => {
  it("renders one input per tunable field", () => {
    render(
      <SearchSpaceEditor schema={schema} values={{}} onChange={() => {}} />,
    );
    expect(screen.getByText("N Estimators")).toBeDefined();
    expect(screen.getByText("Learning Rate")).toBeDefined();
    expect(screen.queryByText("Dataset Path")).toBeNull();
  });

  it("shows inline errors for invalid input", () => {
    render(
      <SearchSpaceEditor
        schema={schema}
        values={{ n_estimators: "abc" }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/not an integer/)).toBeDefined();
  });

  it("calls onChange with raw text", () => {
    const onChange = vi.fn();
    render(
      <SearchSpaceEditor schema={schema} values={{}} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText(/N Estimators/i), {
      target: { value: "100, 200" },
    });
    expect(onChange).toHaveBeenCalledWith("n_estimators", "100, 200");
  });
});
