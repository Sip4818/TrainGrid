import { describe, expect, it } from "vitest";

import { endpoints } from "./endpoints";

describe("endpoints.runs", () => {
  it("list() returns /runs/", () => {
    expect(endpoints.runs.list()).toBe("/runs/");
  });

  it("detail(id) returns /runs/{id}", () => {
    expect(endpoints.runs.detail(1)).toBe("/runs/1");
    expect(endpoints.runs.detail(42)).toBe("/runs/42");
    expect(endpoints.runs.detail(999)).toBe("/runs/999");
  });

  it("create() returns /runs/", () => {
    expect(endpoints.runs.create()).toBe("/runs/");
  });
});
