import { describe, expect, it } from "vitest";
import { formatAcAn, formatAf, formatDate, formatInt } from "./format";

describe("format utils", () => {
  it("formats integers with en-US grouping", () => {
    expect(formatInt(0)).toBe("0");
    expect(formatInt(1234)).toBe("1,234");
    expect(formatInt(1234567)).toBe("1,234,567");
  });

  it("formats AC/AN values using grouped integers", () => {
    expect(formatAcAn(12, 3456)).toBe("12 / 3,456");
    expect(formatAcAn(1234, 567890)).toBe("1,234 / 567,890");
  });

  it("formats allele frequencies to four decimal places", () => {
    expect(formatAf(0)).toBe("0.0000");
    expect(formatAf(0.123456)).toBe("0.1235");
    expect(formatAf(1)).toBe("1.0000");
  });

  it("formats ISO dates in UTC as day month year", () => {
    expect(formatDate("2024-02-14")).toBe("14 Feb 2024");
    expect(formatDate("2023-12-01")).toBe("1 Dec 2023");
  });
});
