// The arithmetic behind Review: for each candidate variant, how its frequency among the
// phenotype-matched participants compares with the rest of the All of Us cohort, and how the
// matched cohort's ancestry makeup bears on what to expect.
//
// One decision rule drives everything the screen shows -- the verdict, the rail's colour and its
// order: the 95% confidence interval of the odds ratio. A point estimate crossing a threshold is
// never enough on its own, so a single allele against a near-zero cohort frequency reads as
// inconclusive rather than as a hundredfold enrichment.
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

/** "Similar" means the interval rules out a difference this large in either direction. */
export const SIMILARITY_FOLD = 2;
/**
 * An enrichment call needs at least this many matched alternate alleles. The exact interval holds
 * at any count, but one carrier against a near-zero cohort frequency is a recruitment accident
 * away from zero -- the interval can sit above 1 while saying nothing a reviewer should act on.
 */
export const MIN_ALLELES_FOR_ENRICHMENT = 3;

export type Verdict = "enriched" | "depleted" | "similar" | "inconclusive";

export interface Enrichment {
  /** Matched AF over cohort-wide AF, the fold change shown in the verdict. Infinity when the cohort-wide AF is zero. */
  ratio: number;
  matchedAf: number;
  cohortAf: number;
  matchedAc: number;
  matchedAn: number;
  /** Alternate alleles the cohort-wide rate predicts for a matched group this size. */
  expectedMatchedAc: number;
  /**
   * The same expectation weighted by the matched cohort's ancestry makeup (Σ matched alleles in
   * each ancestry group × the variant's All of Us frequency in that group). Null without a breakdown.
   */
  expectedAdjustedAc: number | null;
  /** Two-sided Fisher's exact test on matched vs the rest of the cohort. */
  pValue: number;
  /**
   * Odds ratio from the same 2×2 table (matched vs the rest of the cohort) and its 95% interval:
   * the exact conditional interval, from the same model as pValue. Null when the margins allow only
   * the observed table (nobody anywhere carries the allele, or everyone does).
   */
  oddsRatio: number;
  ci: [number, number] | null;
  verdict: Verdict;
  /** For an inconclusive verdict, which way the point estimate leans; a hint, not a finding. */
  lean: "more" | "fewer" | null;
  /** How far the interval sits from 1, in log units; zero unless the verdict is enriched or depleted. */
  strength: number;
}

/**
 * One candidate variant with both sides of the comparison: its cohort-wide record from the VAT and,
 * when a phenotype filter matched anyone, its statistics among the matched participants. The
 * table and Review both start from these.
 */
export interface MergedVariantRow {
  variant: string;
  cohort: CohortVariantRow;
  /** Null when the search had no phenotype, or the matched participants have no statistics for it. */
  matched: FilteredVariantWithStats | null;
}

/** Joins the cohort-wide and matched rows by variant, keeping the candidate list's order. */
export function mergeVariantRows(
  cohortVariants: CohortVariantRow[],
  filteredVariants: FilteredVariantRow[],
): MergedVariantRow[] {
  const matchedByVariant = new Map(filteredVariants.map((row) => [row.variant, row]));
  return cohortVariants.map((cohort) => {
    const filtered = matchedByVariant.get(cohort.variant);
    return { variant: cohort.variant, cohort, matched: filtered?.hasStats ? filtered : null };
  });
}

/** A merged row as Review reads it: annotated or nothing, and the comparison worked out. */
export interface ComparisonRow {
  variant: string;
  cohort: AnnotatedCohortVariant | null;
  matched: FilteredVariantWithStats | null;
  /** Null when either side lacks counts. */
  enrichment: Enrichment | null;
}

/** The merged rows with each one's enrichment computed, keeping the candidate list's order. */
export function buildComparisonRows(
  cohortVariants: CohortVariantRow[],
  filteredVariants: FilteredVariantRow[],
  ancestryBreakdown: BreakdownSegment[] = [],
): ComparisonRow[] {
  return mergeVariantRows(cohortVariants, filteredVariants).map(({ variant, cohort: row, matched }) => {
    const cohort = row.annotated ? row : null;
    const enrichment =
      cohort && matched && cohort.aouAllAc !== null && cohort.aouAllAn !== null
        ? computeEnrichment(matched.cohortAc, matched.cohortAn, cohort.aouAllAc, cohort.aouAllAn, {
            expectedAdjustedAc: ancestryAdjustedExpectation(cohort, ancestryBreakdown),
          })
        : null;
    return { variant, cohort, matched, enrichment };
  });
}

/**
 * Most informative first: verdicts the interval supports, by how far it clears 1; then similar;
 * then inconclusive; then rows with nothing to compare. Within a tier, the larger the gap between
 * observed and expected alleles the higher, so a single-allele fluke never outranks a real signal.
 */
export function sortByEnrichment(rows: ComparisonRow[]): ComparisonRow[] {
  return [...rows].sort((a, b) => {
    const tierDiff = tier(a.enrichment) - tier(b.enrichment);
    if (tierDiff !== 0 || !a.enrichment || !b.enrichment) return tierDiff;
    if (b.enrichment.strength !== a.enrichment.strength) return b.enrichment.strength - a.enrichment.strength;
    return excess(b.enrichment) - excess(a.enrichment);
  });
}

function tier(e: Enrichment | null): number {
  if (!e) return 3;
  if (e.verdict === "inconclusive") return 2;
  if (e.verdict === "similar") return 1;
  return 0;
}

function excess(e: Enrichment): number {
  return Math.abs(e.matchedAc - e.expectedMatchedAc);
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
  extras: { expectedAdjustedAc?: number | null } = {},
): Enrichment | null {
  if (matchedAn <= 0 || cohortAn <= 0) return null;
  const matchedAf = matchedAc / matchedAn;
  const cohortAf = cohortAc / cohortAn;
  const ratio = cohortAf === 0 ? (matchedAf === 0 ? 1 : Infinity) : matchedAf / cohortAf;

  // The matched participants are part of the cohort, so the comparison group is the rest of it.
  // The mock phenotype data doesn't always respect that nesting; when it doesn't, the whole cohort
  // stands in.
  let restAc = cohortAc - matchedAc;
  let restAn = cohortAn - matchedAn;
  if (restAc < 0 || restAn <= 0 || restAn - restAc < 0) {
    restAc = cohortAc;
    restAn = cohortAn;
  }
  const [a, b, c, d] = [matchedAc, matchedAn - matchedAc, restAc, restAn - restAc];
  const pValue = fisherTwoSided(a, b, c, d);
  const { oddsRatio, ci } = computeOddsRatio(a, b, c, d);

  let verdict: Verdict;
  let strength = 0;
  if (!ci) {
    verdict = "inconclusive";
  } else if (ci[0] > 1) {
    if (matchedAc >= MIN_ALLELES_FOR_ENRICHMENT) {
      verdict = "enriched";
      strength = Math.log(ci[0]);
    } else {
      verdict = "inconclusive";
    }
  } else if (ci[1] < 1) {
    verdict = "depleted";
    strength = Math.log(1 / ci[1]);
  } else if (ci[0] >= 1 / SIMILARITY_FOLD && ci[1] <= SIMILARITY_FOLD) {
    verdict = "similar";
  } else {
    verdict = "inconclusive";
  }

  return {
    ratio,
    matchedAf,
    cohortAf,
    matchedAc,
    matchedAn,
    expectedMatchedAc: matchedAn * cohortAf,
    expectedAdjustedAc: extras.expectedAdjustedAc ?? null,
    pValue,
    oddsRatio,
    ci,
    verdict,
    lean: verdict === "inconclusive" && oddsRatio !== 1 ? (oddsRatio > 1 ? "more" : "fewer") : null,
    strength,
  };
}

/**
 * Odds ratio of the table [[a, b], [c, d]] with an exact 95% interval: the conditional
 * (Cornfield) interval, the one R's fisher.test reports. With the margins fixed, the count a
 * follows Fisher's noncentral hypergeometric distribution in the odds ratio ψ; the lower bound is
 * the ψ at which a count of a or more has 2.5% probability, the upper the ψ at which a count of a
 * or fewer does. It rests on the same model as fisherTwoSided, so it holds at the small counts
 * where Woolf's log interval runs too narrow, and it needs no special case for an empty cell: a
 * count at the edge of what the margins allow just leaves that side open (0 or infinite).
 *
 * The point estimate is the sample odds ratio, ad / bc. With no carriers on either side, or
 * every allele a carrier on both, the margins allow only the observed table and the interval is
 * null.
 */
export function computeOddsRatio(
  a: number,
  b: number,
  c: number,
  d: number,
): { oddsRatio: number; ci: [number, number] | null } {
  const matched = a + b;
  const carriers = a + c;
  const rest = c + d;
  const lo = Math.max(0, carriers - rest);
  const hi = Math.min(matched, carriers);
  const oddsRatio = b * c === 0 ? (a * d === 0 ? 1 : Infinity) : (a * d) / (b * c);
  if (lo === hi) return { oddsRatio: 1, ci: null };

  // log P(X = x) under ψ = 1, for each x the margins allow; ψ tilts it by ψ^x.
  const logCentral: number[] = [];
  for (let x = lo; x <= hi; x++) logCentral.push(logChoose(matched, x) + logChoose(rest, carriers - x));

  /** P(X ≥ a) under ψ when `upper`, else P(X ≤ a). */
  const tail = (logPsi: number, upper: boolean) => {
    let max = -Infinity;
    const terms = logCentral.map((value, i) => {
      const term = value + (lo + i) * logPsi;
      if (term > max) max = term;
      return term;
    });
    let total = 0;
    let inTail = 0;
    terms.forEach((term, i) => {
      const weight = Math.exp(term - max);
      total += weight;
      if (upper ? lo + i >= a : lo + i <= a) inTail += weight;
    });
    return inTail / total;
  };

  /** The log ψ at which the tail is exactly 2.5%, by bisection; P(X ≥ a) rises with ψ, P(X ≤ a) falls. */
  const solve = (upper: boolean) => {
    let low = -60;
    let high = 60;
    for (let i = 0; i < 80; i++) {
      const mid = (low + high) / 2;
      const rising = upper ? tail(mid, true) : 1 - tail(mid, false);
      if (rising < (upper ? ODDS_RATIO_TAIL : 1 - ODDS_RATIO_TAIL)) low = mid;
      else high = mid;
    }
    return Math.exp((low + high) / 2);
  };

  return {
    oddsRatio,
    ci: [a === lo ? 0 : solve(true), a === hi ? Infinity : solve(false)],
  };
}

/** Each side of the 95% odds-ratio interval leaves out 2.5%. */
const ODDS_RATIO_TAIL = 0.025;

/**
 * How many matched alternate alleles the cohort-wide per-ancestry frequencies predict, given the
 * matched cohort's ancestry makeup: Σ over groups of (matched participants × 2 alleles × the
 * variant's All of Us frequency in that group). A group the variant isn't observed in
 * contributes nothing. Null when the breakdown is empty.
 */
export function ancestryAdjustedExpectation(
  cohort: AnnotatedCohortVariant,
  ancestryBreakdown: BreakdownSegment[],
): number | null {
  if (ancestryBreakdown.length === 0) return null;
  const afByPopulation = new Map(cohort.aouPopulations.map((p) => [p.population, p.af ?? 0]));
  let expected = 0;
  for (const segment of ancestryBreakdown) {
    expected += segment.count * 2 * (afByPopulation.get(segment.label as SubpopCode) ?? 0);
  }
  return expected;
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

/** p-values for display: "< 0.001", "0.003", "0.42", "1.0". */
export function formatPValue(p: number): string {
  if (p < 0.001) return "< 0.001";
  if (p >= 0.995) return "1.0";
  return p.toFixed(p < 0.01 ? 3 : 2);
}

/** A number to two significant figures, with thousands separators above 999: "0.083", "2.1", "26", "310", "1,800". */
export function formatSig(value: number): string {
  if (value === 0) return "0";
  if (!Number.isFinite(value)) return "∞";
  return Number(value.toPrecision(2)).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** A fold change for display: "26×", "0.31×", "∞". Two significant figures, never truncated. */
export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "∞";
  return `${formatSig(ratio)}×`;
}

/** An interval for display: "13 – 83", "0 – 1,800", "120 – ∞". */
export function formatInterval([low, high]: [number, number]): string {
  return `${formatSig(low)} – ${formatSig(high)}`;
}

/** Expected counts for display: "< 0.001", "0.002", "0.23", "9.1", "120". */
export function formatExpected(expected: number): string {
  if (expected >= 10) return expected.toFixed(0);
  if (expected >= 1) return expected.toFixed(1);
  if (expected >= 0.01) return expected.toFixed(2);
  return expected < 0.001 ? "< 0.001" : expected.toFixed(3);
}
