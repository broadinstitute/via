import { describe, expect, it } from "vitest";
import { overLimitMessage, parseVariantsText, variantEntryStatus } from "./variants";

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

describe("variantEntryStatus", () => {
  it("can't search with nothing entered, counting blank lines as nothing", () => {
    expect(variantEntryStatus("\n  \n", 50)).toEqual({ count: 0, overLimit: false, canSearch: false });
  });

  it("can search from one variant up to the limit", () => {
    expect(variantEntryStatus("8-11708582-C-T", 50)).toEqual({ count: 1, overLimit: false, canSearch: true });
    expect(variantEntryStatus("a\nb", 2)).toEqual({ count: 2, overLimit: false, canSearch: true });
  });

  it("can't search above the limit", () => {
    expect(variantEntryStatus("a\nb\nc", 2)).toEqual({ count: 3, overLimit: true, canSearch: false });
  });
});

describe("overLimitMessage", () => {
  it("says how many to remove", () => {
    expect(overLimitMessage(53, 50)).toBe("53 variants entered. Remove 3 to search (limit 50).");
  });
});
