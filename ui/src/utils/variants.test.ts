import { describe, expect, it } from "vitest";
import { parseVariantsText } from "./variants";

describe("parseVariantsText", () => {
  it("returns an empty list for empty input", () => {
    expect(parseVariantsText("")).toEqual([]);
  });

  it("splits variants on newlines", () => {
    expect(parseVariantsText("8-11708582-C-T\n1-12345-A-G")).toEqual([
      "8-11708582-C-T",
      "1-12345-A-G",
    ]);
  });

  it("trims surrounding whitespace from each line", () => {
    expect(parseVariantsText(" 8-11708582-C-T \n\t1-12345-A-G\t")).toEqual([
      "8-11708582-C-T",
      "1-12345-A-G",
    ]);
  });

  it("drops blank lines and whitespace-only lines", () => {
    expect(parseVariantsText("\n8-11708582-C-T\n   \n\n1-12345-A-G\n")).toEqual([
      "8-11708582-C-T",
      "1-12345-A-G",
    ]);
  });

  it("preserves input order and duplicates", () => {
    expect(parseVariantsText("1-1-A-G\n2-2-C-T\n1-1-A-G")).toEqual([
      "1-1-A-G",
      "2-2-C-T",
      "1-1-A-G",
    ]);
  });
});
