import { describe, expect, it } from "vitest";

import { endpoints } from "./endpoints";

describe("endpoints.trainers", () => {
  it("list() returns /trainers/", () => {
    expect(endpoints.trainers.list()).toBe("/trainers/");
  });
});

describe("endpoints.runs", () => {
  it("list(projectId, experimentId) returns scoped URL", () => {
    expect(endpoints.runs.list(1, 2)).toBe(
      "/runs/?project_id=1&experiment_id=2",
    );
  });

  it("detail(id, projectId, experimentId) returns scoped URL", () => {
    expect(endpoints.runs.detail(1, 10, 20)).toBe(
      "/runs/1?project_id=10&experiment_id=20",
    );
  });

  it("create() returns /runs/", () => {
    expect(endpoints.runs.create()).toBe("/runs/");
  });

  it("delete(id, projectId, experimentId) returns scoped URL", () => {
    expect(endpoints.runs.delete(1, 10, 20)).toBe(
      "/runs/1?project_id=10&experiment_id=20",
    );
  });

  it("compare(projectId, experimentId, runIds) returns scoped URL", () => {
    expect(endpoints.runs.compare(1, 2, [3, 4])).toBe(
      "/runs/compare?project_id=1&experiment_id=2&run_ids=3&run_ids=4",
    );
  });
});

describe("endpoints.experiments", () => {
  it("list(projectId) returns scoped URL", () => {
    expect(endpoints.experiments.list(1)).toBe("/experiments/?project_id=1");
  });

  it("detail(id, projectId) returns scoped URL", () => {
    expect(endpoints.experiments.detail(1, 2)).toBe(
      "/experiments/1?project_id=2",
    );
  });

  it("create() returns /experiments/", () => {
    expect(endpoints.experiments.create()).toBe("/experiments/");
  });

  it("delete(id, projectId) returns scoped URL", () => {
    expect(endpoints.experiments.delete(1, 2)).toBe(
      "/experiments/1?project_id=2",
    );
  });
});

describe("endpoints.datasets", () => {
  it("list() returns /datasets/", () => {
    expect(endpoints.datasets.list()).toBe("/datasets/");
  });

  it("upload() returns /datasets/", () => {
    expect(endpoints.datasets.upload()).toBe("/datasets/");
  });
});

describe("endpoints.models", () => {
  it("list() returns /models/", () => {
    expect(endpoints.models.list()).toBe("/models/");
  });

  it("detail(name) returns model URL", () => {
    expect(endpoints.models.detail("fraud-detector")).toBe(
      "/models/fraud-detector",
    );
  });

  it("versions(name) returns versions URL", () => {
    expect(endpoints.models.versions("fraud-detector")).toBe(
      "/models/fraud-detector/versions",
    );
  });

  it("register() returns /models/", () => {
    expect(endpoints.models.register()).toBe("/models/");
  });

  it("promote(name, version) returns promote URL", () => {
    expect(endpoints.models.promote("fraud-detector", "v1.0.0")).toBe(
      "/models/fraud-detector/versions/v1.0.0/promote",
    );
  });
});
