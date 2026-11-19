// The statistics behind Review, on plain allele counts: Fisher's exact test, the exact
// odds-ratio interval, and the verdict rule that reads them. Nothing here knows about variants,
// rows or the screen; comparison.ts feeds it counts and takes back an Enrichment.
//
// One decision rule drives everything the screen shows -- the verdict, the rail's colour and its
// order: the 95% confidence interval of the odds ratio. A point estimate crossing a threshold is
// never enough on its own, so a single allele against a near-zero cohort frequency reads as
// inconclusive rather than as a hundredfold enrichment.

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
   * the conditional maximum likelihood estimate and exact conditional interval, from the same
   * model as pValue. Null when the margins allow only
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
  // Counts that can't be nested (more matched carriers or alleles than the whole cohort has) come
  // from sources that disagree, and no comparison against them is valid: Fisher's test needs two
  // separate groups, and comparing the matched group with a cohort that contains it is neither.
  const restAc = cohortAc - matchedAc;
  const restAn = cohortAn - matchedAn;
  if (restAc < 0 || restAn <= 0 || restAn - restAc < 0) return null;
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
 * The point estimate is the conditional maximum likelihood estimate (what R's fisher.test and
 * scipy's odds_ratio(kind="conditional") report): the ψ whose expected count is the observed a. It
 * differs slightly from the sample odds ratio ad / bc, and unlike it always sits inside the
 * interval. With no carriers on either side, or
 * every allele a carrier on both, the margins allow only the observed table and the interval is
 * null.
 *
 * Each tail probability (and the mean) is summed from the distribution's mode outward, by the ratio of one
 * term to the next, stopping once terms are negligible. The mass sits within a few hundred
 * values of the mode however wide the support, so a common variant in a large matched cohort
 * (a support of 100,000 values) costs the same few milliseconds as a rare one.
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
  if (lo === hi) return { oddsRatio: 1, ci: null };

  /**
   * Walks the terms of the distribution under ψ outward from its mode, relative to the mode's
   * term (which is 1), calling `visit(x, term)` for each; returns the sum of the terms.
   */
  const walk = (logPsi: number, visit: (x: number, term: number) => void) => {
    const psi = Math.exp(logPsi);
    // P(X = x + 1) / P(X = x): ψ times the hypergeometric ratio. It falls as x rises, so the
    // terms are unimodal.
    const ratio = (x: number) => (psi * (matched - x) * (carriers - x)) / ((x + 1) * (rest - carriers + x + 1));
    // The mode: the first x whose next term is smaller, found by bisection on the ratio.
    let low = lo;
    let high = hi;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (ratio(mid) < 1) high = mid;
      else low = mid + 1;
    }
    const mode = low;

    let total = 1;
    visit(mode, 1);
    let term = 1;
    for (let x = mode; x < hi; x++) {
      term *= ratio(x);
      if (term < NEGLIGIBLE_TERM) break;
      total += term;
      visit(x + 1, term);
    }
    term = 1;
    for (let x = mode; x > lo; x--) {
      term /= ratio(x - 1);
      if (term < NEGLIGIBLE_TERM) break;
      total += term;
      visit(x - 1, term);
    }
    return total;
  };

  /** P(X ≥ a) under ψ when `upper`, else P(X ≤ a). */
  const tail = (logPsi: number, upper: boolean) => {
    let inTail = 0;
    const total = walk(logPsi, (x, term) => {
      if (upper ? x >= a : x <= a) inTail += term;
    });
    return inTail / total;
  };

  /** E[X] under ψ; it rises from lo to hi as ψ does. */
  const mean = (logPsi: number) => {
    let weighted = 0;
    const total = walk(logPsi, (x, term) => {
      weighted += x * term;
    });
    return weighted / total;
  };

  /** The log ψ at which `rising`, an increasing function of ψ, reaches `target`, by bisection. */
  const solve = (rising: (logPsi: number) => number, target: number) => {
    let low = -60;
    let high = 60;
    for (let i = 0; i < BISECTION_STEPS; i++) {
      const mid = (low + high) / 2;
      if (rising(mid) < target) low = mid;
      else high = mid;
    }
    return Math.exp((low + high) / 2);
  };

  // The conditional MLE: the ψ whose expected count is the observed one. At the edge of the
  // support no finite ψ does that, so the estimate is 0 or infinite.
  const oddsRatio = a === lo ? 0 : a === hi ? Infinity : solve(mean, a);

  return {
    oddsRatio,
    ci: [
      a === lo ? 0 : solve((m) => tail(m, true), ODDS_RATIO_TAIL),
      a === hi ? Infinity : solve((m) => 1 - tail(m, false), 1 - ODDS_RATIO_TAIL),
    ],
  };
}

/**
 * A term this small relative to the mode's is dropped. Even a support of a million values can
 * then only lose a millionth of a billionth of the mass -- nothing at two significant figures.
 */
const NEGLIGIBLE_TERM = 1e-17;
/** Halvings of the 120-unit log ψ range: a relative precision of 1e-13, far past what's shown. */
const BISECTION_STEPS = 50;

/** Each side of the 95% odds-ratio interval leaves out 2.5%. */
const ODDS_RATIO_TAIL = 0.025;

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
