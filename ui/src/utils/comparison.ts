// The arithmetic behind Quick review: for each candidate variant, how its frequency among the
// phenotype-matched participants compares with the whole All of Us cohort, and how the matched
// cohort's ancestry makeup lines up with where the variant is most common.
//
// Everything here is pure and takes the rows the results page already has; nothing is fetched.

import type {
  AnnotatedCohortVariant,
  BreakdownSegment,
  CohortVariantRow,
  FilteredVariantRow,
  FilteredVariantWithStats,
  GnomadSubpopCode,
  SubpopCode,
} from "../types/results";
import { AOU_SUBPOP_CODES } from "./subpopulations";

/** A ratio at or above this reads as enriched; at or below its inverse, depleted. Matches the table's AF Ratio flag. */
export const ENRICHMENT_RATIO_THRESHOLD = 2;
export const SIGNIFICANCE_LEVEL = 0.05;
/** Below this many alternate alleles in the matched cohort the ratio is too noisy to lean on. */
export const LOW_COUNT_THRESHOLD = 5;

export type Direction = "enriched" | "depleted" | "similar";

export interface Enrichment {
  /** Matched AF over cohort-wide AF. Infinity when the cohort-wide AF is zero and the matched isn't. */
  ratio: number;
  matchedAf: number;
  cohortAf: number;
  /** 95% confidence interval for the ratio (Katz log method, with a 0.5 continuity correction at zero counts). */
  ci: [number, number];
  /** Two-sided Fisher's exact test on matched vs the rest of the cohort. */
  pValue: number;
  direction: Direction;
  significant: boolean;
  /** Few alternate alleles among matched participants: shown as a caution alongside the verdict. */
  lowCount: boolean;
}

export interface ComparisonRow {
  variant: string;
  cohort: AnnotatedCohortVariant | null;
  matched: FilteredVariantWithStats | null;
  /** Null when either side lacks counts. */
  enrichment: Enrichment | null;
}

/** Joins the two tables' rows by variant, keeping the candidate list's order. */
export function buildComparisonRows(
  cohortVariants: CohortVariantRow[],
  filteredVariants: FilteredVariantRow[],
): ComparisonRow[] {
  const matchedByVariant = new Map(filteredVariants.map((row) => [row.variant, row]));
  return cohortVariants.map((row) => {
    const cohort = row.annotated ? row : null;
    const filtered = matchedByVariant.get(row.variant);
    const matched = filtered?.hasStats ? filtered : null;
    const enrichment =
      cohort && matched && cohort.aouAllAc !== null && cohort.aouAllAn !== null
        ? computeEnrichment(matched.cohortAc, matched.cohortAn, cohort.aouAllAc, cohort.aouAllAn)
        : null;
    return { variant: row.variant, cohort, matched, enrichment };
  });
}

/** Strongest signal first: largest ratios, then smallest, with rows lacking a comparison last. */
export function sortByEnrichment(rows: ComparisonRow[]): ComparisonRow[] {
  return [...rows].sort((a, b) => {
    if (!a.enrichment || !b.enrichment) return (a.enrichment ? 0 : 1) - (b.enrichment ? 0 : 1);
    return Math.abs(Math.log2(safeRatio(b.enrichment))) - Math.abs(Math.log2(safeRatio(a.enrichment)));
  });
}

function safeRatio({ ratio }: Enrichment): number {
  if (ratio === 0) return 1 / 1e6;
  if (!Number.isFinite(ratio)) return 1e6;
  return ratio;
}

/**
 * @param matchedAc alternate alleles among phenotype-matched participants
 * @param matchedAn alleles called among them
 * @param cohortAc alternate alleles across the whole All of Us cohort (which includes the matched)
 * @param cohortAn alleles called across the whole cohort
 */
export function computeEnrichment(
  matchedAc: number,
  matchedAn: number,
  cohortAc: number,
  cohortAn: number,
): Enrichment | null {
  if (matchedAn <= 0 || cohortAn <= 0) return null;
  const matchedAf = matchedAc / matchedAn;
  const cohortAf = cohortAc / cohortAn;
  const ratio = cohortAf === 0 ? (matchedAf === 0 ? 1 : Infinity) : matchedAf / cohortAf;

  // The matched participants are part of the cohort, so the exact test compares them with the
  // rest of it. The mock phenotype data doesn't always respect that nesting; when it doesn't, the
  // whole cohort stands in as the comparison group.
  let restAc = cohortAc - matchedAc;
  let restAn = cohortAn - matchedAn;
  if (restAc < 0 || restAn <= 0 || restAn - restAc < 0) {
    restAc = cohortAc;
    restAn = cohortAn;
  }
  const pValue = fisherTwoSided(matchedAc, matchedAn - matchedAc, restAc, restAn - restAc);

  // Katz: log(ratio) ± 1.96 · sqrt(1/a − 1/n1 + 1/c − 1/n2), nudging zero counts to 0.5 so the
  // interval is defined.
  const a = matchedAc === 0 ? 0.5 : matchedAc;
  const c = cohortAc === 0 ? 0.5 : cohortAc;
  const logRatio = Math.log((a / matchedAn) / (c / cohortAn));
  const se = Math.sqrt(1 / a - 1 / matchedAn + 1 / c - 1 / cohortAn);
  const ci: [number, number] = [Math.exp(logRatio - 1.96 * se), Math.exp(logRatio + 1.96 * se)];

  const direction: Direction =
    ratio >= ENRICHMENT_RATIO_THRESHOLD ? "enriched" : ratio <= 1 / ENRICHMENT_RATIO_THRESHOLD ? "depleted" : "similar";

  return {
    ratio,
    matchedAf,
    cohortAf,
    ci,
    pValue,
    direction,
    significant: pValue < SIGNIFICANCE_LEVEL,
    lowCount: matchedAc < LOW_COUNT_THRESHOLD,
  };
}

// Lanczos approximation of ln Γ(x), accurate to ~1e-13 for the sizes here.
const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let sum = 0.99999999999980993;
  for (let i = 0; i < LANCZOS.length; i++) sum += LANCZOS[i] / (x + i + 1);
  const t = x + LANCZOS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum);
}

function logChoose(n: number, k: number): number {
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/**
 * Two-sided Fisher's exact test for the table [[a, b], [c, d]]: the total probability of every
 * table with the same margins that is at least as unlikely as the observed one.
 */
export function fisherTwoSided(a: number, b: number, c: number, d: number): number {
  const n1 = a + b;
  const n2 = c + d;
  const k = a + c;
  const n = n1 + n2;
  if (n === 0 || n1 === 0 || n2 === 0 || k === 0 || k === n) return 1;
  const logDenominator = logChoose(n, k);
  const logProb = (x: number) => logChoose(n1, x) + logChoose(n2, k - x) - logDenominator;
  const observed = logProb(a);
  // Relative slack: tables with probability equal to the observed one, up to rounding, count.
  const cutoff = observed + 1e-7;
  let total = 0;
  for (let x = Math.max(0, k - n2); x <= Math.min(k, n1); x++) {
    const p = logProb(x);
    if (p <= cutoff) total += Math.exp(p);
  }
  return Math.min(1, total);
}

export interface AncestryContextRow {
  population: SubpopCode;
  /** The matched cohort's participants of this ancestry, and their share of it; null when the breakdown lacks the group. */
  matchedCount: number | null;
  matchedPercent: number | null;
  /** Cohort-wide All of Us frequency in this population; null when not observed. */
  aouAf: number | null;
  aouAc: number | null;
  aouAn: number | null;
  /** gnomAD's frequency for the same code where its vocabulary has one (EUR and MID have no counterpart). */
  gnomadAf: number | null;
  isAouPopmax: boolean;
}

/**
 * One row per All of Us ancestry group: how much of the matched cohort it makes up, beside the
 * variant's frequency within it cohort-wide. That pairing is what tells a counselor whether a
 * cohort-wide figure is representative of the people actually matched.
 */
export function ancestryContext(
  cohort: AnnotatedCohortVariant | null,
  ancestryBreakdown: BreakdownSegment[],
): AncestryContextRow[] {
  const breakdown = new Map(ancestryBreakdown.map((segment) => [segment.label, segment]));
  const aou = new Map(cohort?.aouPopulations.map((p) => [p.population, p]) ?? []);
  const gnomad = new Map(cohort?.gnomadPopulations.map((p) => [p.population, p]) ?? []);
  return AOU_SUBPOP_CODES.map((population) => {
    const segment = breakdown.get(population);
    const aouPop = aou.get(population);
    const gnomadPop = gnomad.get(population as GnomadSubpopCode);
    return {
      population,
      matchedCount: segment?.count ?? null,
      matchedPercent: segment?.percent ?? null,
      aouAf: aouPop?.af ?? null,
      aouAc: aouPop?.ac ?? null,
      aouAn: aouPop?.an ?? null,
      gnomadAf: gnomadPop?.af ?? null,
      isAouPopmax: cohort?.aouSubpopulation === population,
    };
  });
}

/** The ancestry group that makes up the largest share of the matched cohort, if the breakdown names one. */
export function largestMatchedAncestry(rows: AncestryContextRow[]): AncestryContextRow | null {
  let best: AncestryContextRow | null = null;
  for (const row of rows) {
    if (row.matchedCount !== null && (best === null || row.matchedCount > (best.matchedCount ?? 0))) best = row;
  }
  return best;
}

/** p-values for display: "< 0.001", "0.003", "0.42". */
export function formatPValue(p: number): string {
  if (p < 0.001) return "< 0.001";
  return p.toFixed(p < 0.01 ? 3 : 2);
}

/** Ratios for display: "17.0×", "0.3×", "> 100×" for an effectively infinite one. */
export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "> 100×";
  if (ratio >= 100) return "> 100×";
  return `${ratio.toFixed(1)}×`;
}
