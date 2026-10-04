import { describe, expect, it } from "vitest";
import type { AnnotatedCohortVariant, FilteredVariantRow } from "../types/results";
import {
  ancestryAdjustedExpectation,
  ancestryContext,
  buildComparisonRows,
  computeEnrichment,
  computeOddsRatio,
  fisherTwoSided,
  formatExpected,
  formatInterval,
  formatPValue,
  formatRatio,
  formatSig,
  largestMatchedAncestry,
  sortByEnrichment,
} from "./comparison";

const ANNOTATED: AnnotatedCohortVariant = {
  annotated: true,
  variant: "2-122517541-C-G",
  gene: "LDLR",
  consequence: "Missense",
  proteinChange: "p.Arg123Gly",
  aouSubpopulation: "AFR",
  aouAf: 0.012,
  aouAc: 24,
  aouAn: 2000,
  aouPopulations: [
    { population: "EUR", af: 0.0004, ac: 4, an: 10000 },
    { population: "AFR", af: 0.012, ac: 24, an: 2000 },
  ],
  aouAllAf: 0.0012,
  aouAllAc: 28,
  aouAllAn: 24000,
  gnomadSubpopulation: "AFR",
  gnomadAf: 0.01,
  gnomadAc: 100,
  gnomadAn: 10000,
  gnomadUrl: null,
  gnomadPopulations: [{ population: "AFR", af: 0.01, ac: 100, an: 10000 }],
  gnomadAllAf: 0.002,
  gnomadAllAc: 200,
  gnomadAllAn: 100000,
  clinvarSignificance: "Pathogenic",
  clinvarUrl: null,
  clinvarStars: 2,
  clinvarHasConflicts: false,
  clinvarConditions: [],
  clinvarLastUpdated: null,
  clinvarSubmissions: [],
  spliceAi: 0.02,
  plof: null,
};

const MATCHED: FilteredVariantRow = {
  variant: "2-122517541-C-G",
  gene: "LDLR",
  consequence: "Missense",
  hasStats: true,
  cohortAc: 6,
  cohortAn: 200,
  cohortAf: 0.03,
  homozygotes: 0,
  heterozygotes: 6,
  clinvarPlpInTrans: 1,
  afRatio: 25,
};

describe("computeEnrichment", () => {
  it("calls a departure enriched only when the whole interval sits above 1", () => {
    const result = computeEnrichment(6, 200, 28, 24000)!;
    expect(result.ratio).toBeCloseTo(25.7, 1);
    expect(result.verdict).toBe("enriched");
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.oddsRatio).toBeCloseTo(33.4, 1);
    expect(result.ci![0]).toBeGreaterThan(1);
    expect(result.strength).toBeCloseTo(Math.log(result.ci![0]), 6);
    expect(result.matchedAc).toBe(6);
    expect(result.expectedMatchedAc).toBeCloseTo(0.233, 2);
    expect(result.lean).toBeNull();
  });

  it("calls a departure depleted only when the whole interval sits below 1", () => {
    const result = computeEnrichment(1, 2000, 300, 20000)!;
    expect(result.verdict).toBe("depleted");
    expect(result.ci![1]).toBeLessThan(1);
    expect(result.strength).toBeGreaterThan(0);
  });

  it("calls frequencies similar when the interval rules out a 2-fold difference either way", () => {
    const result = computeEnrichment(30, 1000, 600, 20000)!;
    expect(result.verdict).toBe("similar");
    expect(result.ci![0]).toBeGreaterThanOrEqual(0.5);
    expect(result.ci![1]).toBeLessThanOrEqual(2);
    expect(result.strength).toBe(0);
  });

  it("calls a wide interval that straddles 1 inconclusive, however far the point estimate sits from 1", () => {
    // The reviewer's PCSK9 case in spirit: a 0.3× point estimate on three alleles, interval touching 1.
    const result = computeEnrichment(3, 782, 5577, 479860)!;
    expect(result.ratio).toBeCloseTo(0.33, 2);
    expect(result.ci![0]).toBeLessThan(1);
    expect(result.ci![1]).toBeGreaterThan(1);
    expect(result.verdict).toBe("inconclusive");
    expect(result.lean).toBe("fewer");

    // One allele at twice the cohort rate: a wide interval, no verdict.
    const fluke = computeEnrichment(1, 100, 100, 20000)!;
    expect(fluke.ratio).toBeCloseTo(2, 0);
    expect(fluke.verdict).toBe("inconclusive");
    expect(fluke.lean).toBe("more");
  });

  it("won't call enrichment on fewer than three matched alleles, even when the interval clears 1", () => {
    // One matched allele against two in the rest of a 480k-allele cohort: the interval sits well
    // above 1 and the exact test is small, but one carrier is not a finding.
    const single = computeEnrichment(1, 262, 3, 481436)!;
    expect(single.ci![0]).toBeGreaterThan(1);
    expect(single.pValue).toBeLessThan(0.01);
    expect(single.verdict).toBe("inconclusive");
    expect(single.lean).toBe("more");
    expect(single.strength).toBe(0);

    const three = computeEnrichment(3, 262, 5, 481436)!;
    expect(three.verdict).toBe("enriched");
  });

  it("bounds a zero count by the rule of three instead of inventing an interval", () => {
    // 0 of 262 against 3 of 481,436, where 0.002 were expected: no information either way.
    const result = computeEnrichment(0, 262, 3, 481436)!;
    expect(result.verdict).toBe("inconclusive");
    expect(result.ratio).toBe(0);
    expect(result.oddsRatio).toBe(0);
    expect(result.ci![0]).toBe(0);
    expect(result.ci![1]).toBeGreaterThan(1);
    expect(result.expectedMatchedAc).toBeCloseTo(0.0016, 3);
    expect(result.lean).toBe("fewer");

    // 0 of 400 where 100 were expected: a real shortfall, and the bound says so.
    const shortfall = computeEnrichment(0, 400, 6000, 24000)!;
    expect(shortfall.expectedMatchedAc).toBe(100);
    expect(shortfall.ci![1]).toBeLessThan(1);
    expect(shortfall.verdict).toBe("depleted");

    // Carriers among the matched and none anywhere else: enriched, with an open upper end.
    const only = computeEnrichment(3, 200, 3, 24000)!;
    expect(only.oddsRatio).toBe(Infinity);
    expect(only.ci![0]).toBeGreaterThan(1);
    expect(only.ci![1]).toBe(Infinity);
    expect(only.verdict).toBe("enriched");
  });

  it("has nothing to say when nobody carries the allele, and nothing to divide by without alleles", () => {
    const nobody = computeEnrichment(0, 200, 0, 24000)!;
    expect(nobody.ratio).toBe(1);
    expect(nobody.ci).toBeNull();
    expect(nobody.verdict).toBe("inconclusive");
    expect(nobody.lean).toBeNull();
    expect(computeEnrichment(3, 0, 28, 24000)).toBeNull();
  });

  it("carries the ancestry-adjusted expectation through when given", () => {
    expect(computeEnrichment(6, 200, 28, 24000, { expectedAdjustedAc: 1.0 })!.expectedAdjustedAc).toBe(1.0);
    expect(computeEnrichment(6, 200, 28, 24000)!.expectedAdjustedAc).toBeNull();
  });
});

describe("computeOddsRatio", () => {
  it("computes the odds ratio and its Woolf interval", () => {
    const { oddsRatio, ci } = computeOddsRatio(10, 90, 20, 380);
    // (10·380) / (90·20)
    expect(oddsRatio).toBeCloseTo(2.11, 2);
    expect(ci![0]).toBeCloseTo(0.96, 2);
    expect(ci![1]).toBeCloseTo(4.67, 2);
  });

  it("uses the rule of three on an empty side", () => {
    const none = computeOddsRatio(0, 100, 5, 495);
    expect(none.oddsRatio).toBe(0);
    expect(none.ci![0]).toBe(0);
    // Matched odds < (3/100)/(1 − 3/100) ≈ 0.0309, over rest odds 5/495.
    expect(none.ci![1]).toBeCloseTo(0.0309 / (5 / 495), 1);

    const all = computeOddsRatio(3, 97, 0, 500);
    expect(all.oddsRatio).toBe(Infinity);
    expect(all.ci![1]).toBe(Infinity);
    expect(all.ci![0]).toBeCloseTo((3 / 97) / (3 / 500 / (1 - 3 / 500)), 1);
  });

  it("leaves the interval undefined when neither side has carriers", () => {
    expect(computeOddsRatio(0, 100, 0, 500)).toEqual({ oddsRatio: 1, ci: null });
  });
});

describe("fisherTwoSided", () => {
  it("matches a textbook value", () => {
    // Lady tasting tea, [[3,1],[1,3]]: two-sided p = 0.4857.
    expect(fisherTwoSided(3, 1, 1, 3)).toBeCloseTo(0.4857, 3);
  });

  it("returns 1 for a table with no information", () => {
    expect(fisherTwoSided(0, 10, 0, 10)).toBe(1);
    expect(fisherTwoSided(5, 0, 5, 0)).toBe(1);
  });
});

describe("ancestryAdjustedExpectation", () => {
  it("weights each ancestry group's frequency by its matched participants", () => {
    const expected = ancestryAdjustedExpectation(ANNOTATED, [
      { label: "EUR", count: 60, percent: 60, color: "#000" },
      { label: "AFR", count: 40, percent: 40, color: "#000" },
      // No frequency recorded for AMR: contributes nothing.
      { label: "AMR", count: 10, percent: 0, color: "#000" },
    ]);
    // 60·2·0.0004 + 40·2·0.012
    expect(expected).toBeCloseTo(0.048 + 0.96, 6);
    expect(ancestryAdjustedExpectation(ANNOTATED, [])).toBeNull();
  });
});

describe("buildComparisonRows / sortByEnrichment", () => {
  it("ranks an inconclusive fluke below a supported signal, however extreme its ratio", () => {
    const fluke: AnnotatedCohortVariant = { ...ANNOTATED, variant: "7-150974917-G-A", aouAllAc: 3, aouAllAn: 481436 };
    const flukeMatched: FilteredVariantRow = { ...MATCHED, variant: "7-150974917-G-A", cohortAc: 1, cohortAn: 262, cohortAf: 0.0038, afRatio: 600 };
    const rows = buildComparisonRows([fluke, ANNOTATED], [flukeMatched, MATCHED]);
    expect(rows[0].enrichment!.ratio).toBeGreaterThan(100);
    expect(rows[0].enrichment!.verdict).toBe("inconclusive");

    const sorted = sortByEnrichment(rows);
    expect(sorted.map((row) => row.variant)).toEqual(["2-122517541-C-G", "7-150974917-G-A"]);
  });

  it("joins the two tables by variant, passes the ancestry breakdown through, and orders by support", () => {
    const flat: AnnotatedCohortVariant = { ...ANNOTATED, variant: "1-100-A-T", aouAllAc: 300, aouAllAn: 20000 };
    const flatMatched: FilteredVariantRow = { ...MATCHED, variant: "1-100-A-T", cohortAc: 3, cohortAn: 200, cohortAf: 0.015, afRatio: 1 };
    const rows = buildComparisonRows(
      [flat, ANNOTATED, { annotated: false, variant: "7-1-G-A" }],
      [MATCHED, flatMatched, { variant: "7-1-G-A", gene: null, consequence: null, hasStats: false }],
      [{ label: "AFR", count: 100, percent: 100, color: "#000" }],
    );

    expect(rows.map((row) => row.variant)).toEqual(["1-100-A-T", "2-122517541-C-G", "7-1-G-A"]);
    expect(rows[1].enrichment!.expectedAdjustedAc).toBeCloseTo(100 * 2 * 0.012, 6);
    expect(rows[2].cohort).toBeNull();
    expect(rows[2].matched).toBeNull();
    expect(rows[2].enrichment).toBeNull();

    const sorted = sortByEnrichment(rows);
    expect(sorted.map((row) => row.variant)).toEqual(["2-122517541-C-G", "1-100-A-T", "7-1-G-A"]);
  });
});

describe("ancestryContext", () => {
  it("pairs each All of Us ancestry group's share of the matched cohort with the variant's frequency in it", () => {
    const rows = ancestryContext(ANNOTATED, [
      { label: "EUR", count: 30, percent: 60, color: "#000" },
      { label: "AFR", count: 20, percent: 40, color: "#000" },
    ]);

    expect(rows.map((row) => row.population)).toEqual(["EUR", "AFR", "AMR", "EAS", "SAS", "MID", "OTH"]);
    const afr = rows.find((row) => row.population === "AFR")!;
    expect(afr).toMatchObject({ matchedCount: 20, matchedPercent: 40, aouAf: 0.012, gnomadAf: 0.01, isAouPopmax: true });
    const eur = rows.find((row) => row.population === "EUR")!;
    // gnomAD has no EUR group.
    expect(eur).toMatchObject({ matchedCount: 30, aouAf: 0.0004, gnomadAf: null, isAouPopmax: false });
    expect(rows.find((row) => row.population === "AMR")).toMatchObject({ matchedCount: null, aouAf: null });

    expect(largestMatchedAncestry(rows)?.population).toBe("EUR");
  });
});

describe("formatting", () => {
  it("shows two significant figures and never truncates a large value", () => {
    expect(formatSig(0.0834)).toBe("0.083");
    expect(formatSig(0.98)).toBe("0.98");
    expect(formatSig(2.11)).toBe("2.1");
    expect(formatSig(25.7)).toBe("26");
    expect(formatSig(312)).toBe("310");
    expect(formatSig(1837)).toBe("1,800");
    expect(formatSig(Infinity)).toBe("∞");
    expect(formatRatio(25.7)).toBe("26×");
    expect(formatRatio(0.33)).toBe("0.33×");
    expect(formatRatio(Infinity)).toBe("∞");
    expect(formatInterval([0.0834, 0.98])).toBe("0.083 – 0.98");
    expect(formatInterval([120, Infinity])).toBe("120 – ∞");
  });

  it("formats p-values and expected counts", () => {
    expect(formatPValue(0.0001)).toBe("< 0.001");
    expect(formatPValue(0.0034)).toBe("0.003");
    expect(formatPValue(0.42)).toBe("0.42");
    expect(formatPValue(1)).toBe("1.0");
    expect(formatExpected(0.0016)).toBe("0.002");
    expect(formatExpected(9.13)).toBe("9.1");
    expect(formatExpected(123.4)).toBe("123");
  });
});
