import { describe, expect, it } from "vitest";
import type { AnnotatedCohortVariant, FilteredVariantRow } from "../types/results";
import {
  ancestryContext,
  buildComparisonRows,
  computeEnrichment,
  computeOddsRatio,
  fisherTwoSided,
  formatPValue,
  formatRatio,
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
  it("calls a much higher matched frequency enriched, with a small p-value", () => {
    const result = computeEnrichment(6, 200, 28, 24000)!;
    expect(result.ratio).toBeCloseTo(25.7, 1);
    expect(result.direction).toBe("enriched");
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.significant).toBe(true);
    expect(result.ci![0]).toBeGreaterThan(1);
    expect(result.ci![1]).toBeGreaterThan(result.ci![0]);
    expect(result.matchedAc).toBe(6);
    expect(result.expectedMatchedAc).toBeCloseTo(0.233, 2);
    // Rare variant: the odds ratio (against the rest of the cohort) sits just above the frequency ratio.
    expect(result.oddsRatio).toBeGreaterThan(result.ratio);
    expect(result.oddsRatio).toBeCloseTo(33.5, 0);
    expect(result.oddsRatioCi![0]).toBeGreaterThan(1);
  });

  it("calls a much lower matched frequency depleted", () => {
    const result = computeEnrichment(1, 2000, 300, 20000)!;
    expect(result.direction).toBe("depleted");
    expect(result.ratio).toBeCloseTo(0.033, 2);
  });

  it("calls near-identical frequencies similar and not significant", () => {
    const result = computeEnrichment(30, 1000, 600, 20000)!;
    expect(result.direction).toBe("similar");
    expect(result.significant).toBe(false);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it("flags a handful of matched alleles as a low count and an unsupported ratio as not significant", () => {
    const result = computeEnrichment(1, 100, 200, 20000)!;
    expect(result.lowCount).toBe(true);
    expect(result.direction).toBe("similar");
    const noisy = computeEnrichment(2, 100, 100, 20000)!;
    expect(noisy.direction).toBe("enriched");
    expect(noisy.significant).toBe(false);
  });

  it("treats no matched carriers as inconclusive when fewer than one was expected", () => {
    // The case that first showed up: 0 of 262 against 3 of 481,436, where 0.002 were expected.
    const result = computeEnrichment(0, 262, 3, 481436)!;
    expect(result.direction).toBe("inconclusive");
    expect(result.ratio).toBe(0);
    expect(result.ci).toBeNull();
    expect(result.expectedMatchedAc).toBeCloseTo(0.0016, 3);
    // Rule of three: matched AF below 3/262, so the ratio could still be anything up to this.
    expect(result.upperBound).toBeCloseTo(3 / 262 / (3 / 481436), 0);
    expect(result.pValue).toBeCloseTo(1, 6);
  });

  it("calls no matched carriers depleted when several were expected and the test agrees", () => {
    const result = computeEnrichment(0, 400, 6000, 24000)!;
    expect(result.expectedMatchedAc).toBe(100);
    expect(result.direction).toBe("depleted");
    expect(result.significant).toBe(true);
    expect(result.ci).toBeNull();
  });

  it("handles zero counts without dividing by zero", () => {
    expect(computeEnrichment(0, 200, 0, 24000)!.ratio).toBe(1);
    expect(computeEnrichment(0, 200, 0, 24000)!.direction).toBe("inconclusive");
    expect(computeEnrichment(3, 200, 0, 24000)!.ratio).toBe(Infinity);
    expect(computeEnrichment(3, 200, 0, 24000)!.ci).toBeNull();
    expect(computeEnrichment(3, 0, 28, 24000)).toBeNull();
  });
});

describe("computeOddsRatio", () => {
  it("computes the odds ratio and its Woolf interval", () => {
    const { oddsRatio, oddsRatioCi } = computeOddsRatio(10, 90, 20, 380);
    // (10·380) / (90·20)
    expect(oddsRatio).toBeCloseTo(2.11, 2);
    expect(oddsRatioCi![0]).toBeCloseTo(0.96, 2);
    expect(oddsRatioCi![1]).toBeCloseTo(4.67, 2);
  });

  it("leaves the interval undefined when a cell is zero", () => {
    expect(computeOddsRatio(0, 100, 5, 495)).toEqual({ oddsRatio: 0, oddsRatioCi: null });
    expect(computeOddsRatio(3, 97, 0, 500)).toEqual({ oddsRatio: Infinity, oddsRatioCi: null });
    expect(computeOddsRatio(0, 100, 0, 500).oddsRatio).toBe(1);
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

describe("buildComparisonRows / sortByEnrichment", () => {
  it("ranks an inconclusive zero below a real signal, however extreme its ratio looks", () => {
    const zero: AnnotatedCohortVariant = { ...ANNOTATED, variant: "7-150974917-G-A", aouAllAc: 3, aouAllAn: 481436 };
    const zeroMatched: FilteredVariantRow = { ...MATCHED, variant: "7-150974917-G-A", cohortAc: 0, cohortAn: 262, cohortAf: 0, afRatio: 0 };
    const sorted = sortByEnrichment(buildComparisonRows([zero, ANNOTATED], [zeroMatched, MATCHED]));
    expect(sorted.map((row) => row.variant)).toEqual(["2-122517541-C-G", "7-150974917-G-A"]);
  });

  it("joins the two tables by variant and ranks the strongest departure first", () => {
    const flat: AnnotatedCohortVariant = { ...ANNOTATED, variant: "1-100-A-T", aouAllAc: 300, aouAllAn: 20000 };
    const flatMatched: FilteredVariantRow = { ...MATCHED, variant: "1-100-A-T", cohortAc: 3, cohortAn: 200, cohortAf: 0.015, afRatio: 1 };
    const rows = buildComparisonRows(
      [flat, ANNOTATED, { annotated: false, variant: "7-1-G-A" }],
      [MATCHED, flatMatched, { variant: "7-1-G-A", gene: null, consequence: null, hasStats: false }],
    );

    expect(rows.map((row) => row.variant)).toEqual(["1-100-A-T", "2-122517541-C-G", "7-1-G-A"]);
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
  it("formats p-values and ratios for the verdict strip", () => {
    expect(formatPValue(0.0001)).toBe("< 0.001");
    expect(formatPValue(0.0034)).toBe("0.003");
    expect(formatPValue(0.42)).toBe("0.42");
    expect(formatRatio(17.04)).toBe("17.0×");
    expect(formatRatio(0.33)).toBe("0.3×");
    expect(formatRatio(Infinity)).toBe("> 100×");
    expect(formatRatio(250)).toBe("> 100×");
  });
});
