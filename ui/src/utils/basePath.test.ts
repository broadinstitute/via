import { describe, expect, it } from "vitest";
import { basePath, publicUrl } from "./basePath";

const PREFIX = "/proxy/google/v1/apps/my-project/via-app/via";

describe("basePath", () => {
  it("is empty at the host root and on ordinary routes", () => {
    expect(basePath("/")).toBe("");
    expect(basePath("/results")).toBe("");
  });

  it("returns the Leonardo proxy prefix, with or without a trailing slash or route", () => {
    expect(basePath(PREFIX)).toBe(PREFIX);
    expect(basePath(`${PREFIX}/`)).toBe(PREFIX);
    expect(basePath(`${PREFIX}/results`)).toBe(PREFIX);
  });

  it("keeps anything in front of the proxy prefix", () => {
    expect(basePath(`/terra${PREFIX}/usage`)).toBe(`/terra${PREFIX}`);
  });

  it("does not match a prefix that is missing its service segment", () => {
    expect(basePath("/proxy/google/v1/apps/my-project/via-app")).toBe("");
  });
});

describe("publicUrl", () => {
  it("is root-relative when there is no prefix", () => {
    expect(publicUrl("favicon.svg")).toBe("/favicon.svg");
  });
});
