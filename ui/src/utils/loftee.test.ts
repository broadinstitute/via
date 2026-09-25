import { describe, expect, it } from "vitest";
import { lofteeRank, lofteeTooltip } from "./loftee";

describe("lofteeTooltip", () => {
  it("explains a clean high-confidence call", () => {
    expect(lofteeTooltip({ plof: "HC", plofFilters: [], plofFlags: [] })).toBe(
      "High-confidence predicted loss of function (LOFTEE).",
    );
  });

  it("gives a low-confidence call's reasons in words", () => {
    expect(lofteeTooltip({ plof: "LC", plofFilters: ["END_TRUNC", "NON_CAN_SPLICE"], plofFlags: [] })).toBe(
      "Low-confidence predicted loss of function (LOFTEE).\n" +
        "Downgraded because: falls in the last 5% of the transcript, where truncation may leave the protein intact; " +
        "at a non-canonical splice site.",
    );
  });

  it("lists flags on a high-confidence call", () => {
    expect(lofteeTooltip({ plof: "HC", plofFilters: [], plofFlags: ["SINGLE_EXON"] })).toContain(
      "Flagged: single-exon transcript, so nonsense-mediated decay is unlikely.",
    );
  });

  /** LOFTEE adds codes between versions; an unknown one should still show, not vanish. */
  it("falls back to the raw code for one it doesn't know", () => {
    expect(lofteeTooltip({ plof: "LC", plofFilters: ["SOME_NEW_FILTER"], plofFlags: [] })).toContain(
      "Downgraded because: SOME_NEW_FILTER.",
    );
  });

  it("says an unscored variant wasn't scored, rather than that it isn't a loss of function", () => {
    expect(lofteeTooltip({ plof: null, plofFilters: [], plofFlags: [] })).toMatch(/^Not scored by LOFTEE/);
  });
});

describe("lofteeRank", () => {
  it("orders HC, LC, then unscored", () => {
    const ranks = [
      lofteeRank({ plof: null, plofFilters: [], plofFlags: [] }),
      lofteeRank({ plof: "LC", plofFilters: ["END_TRUNC"], plofFlags: [] }),
      lofteeRank({ plof: "HC", plofFilters: [], plofFlags: [] }),
    ];
    expect(ranks).toEqual([2, 1, 0]);
  });

  /** Flags are explained in the tooltip only; they don't make a second kind of HC. */
  it("ranks a flagged HC call with any other HC call", () => {
    expect(lofteeRank({ plof: "HC", plofFilters: [], plofFlags: ["SINGLE_EXON"] })).toBe(0);
  });
});
