import type { ConditionSearch } from "./conditions";
import type {
  BreakdownSegment,
  ClinVarSignificance,
  ClinvarSubmission,
  CohortVariantRow,
  FilteredVariantRow,
  GnomadSubpopCode,
  PopulationFrequency,
  SearchSummary,
  SubpopCode,
} from "../types/results";

interface RawCohortVariant {
  variant: string;
  gene: string | null;
  annotated: boolean;
  consequence: string | null;
  proteinChange: string | null;
  aouSubpopulation: SubpopCode | null;
  aouAf: number | null;
  aouAc: number | null;
  aouAn: number | null;
  aouPopulations: PopulationFrequency[];
  aouAllAf: number | null;
  aouAllAc: number | null;
  aouAllAn: number | null;
  gnomadSubpopulation: GnomadSubpopCode | null;
  gnomadAf: number | null;
  gnomadAc: number | null;
  gnomadAn: number | null;
  gnomadUrl: string | null;
  gnomadPopulations: PopulationFrequency[];
  gnomadAllAf: number | null;
  gnomadAllAc: number | null;
  gnomadAllAn: number | null;
  clinvarSignificance: ClinVarSignificance | null;
  clinvarUrl: string | null;
  clinvarStars: number | null;
  clinvarHasConflicts: boolean;
  clinvarConditions: string[];
  clinvarLastUpdated: string | null;
  clinvarSubmissions: ClinvarSubmission[];
  spliceAi: number | null;
  plof: "HC" | "LC" | null;
}

interface RawFilteredVariant {
  variant: string;
  gene: string | null;
  consequence: string | null;
  hasStats: boolean;
  cohortAc: number | null;
  cohortAn: number | null;
  cohortAf: number | null;
  homozygotes: number | null;
  heterozygotes: number | null;
  clinvarPlpInTrans: number | null;
  afRatio: number | null;
}

interface RawSearchResultsResponse {
  searchSummary: SearchSummary;
  // Null when neither a condition term nor concept ids were given. Unlike the phenotype
  // fields below, this is backed by real queries.
  conditionSearch: ConditionSearch | null;
  // Mock data: there's no participant-level source behind them yet. They're scaled to the picked
  // condition's real participant count (the breakdowns sum to it), and empty when it's zero or no
  // condition was found.
  ancestryBreakdown: BreakdownSegment[];
  ageBreakdown: BreakdownSegment[];
  cohortVariants: RawCohortVariant[];
  filteredVariants: RawFilteredVariant[];
}

export interface SearchResults {
  searchSummary: SearchSummary;
  conditionSearch: ConditionSearch | null;
  ancestryBreakdown: BreakdownSegment[];
  ageBreakdown: BreakdownSegment[];
  cohortVariants: CohortVariantRow[];
  filteredVariants: FilteredVariantRow[];
}

function toCohortVariantRow(raw: RawCohortVariant): CohortVariantRow {
  if (!raw.annotated) {
    return { annotated: false, variant: raw.variant };
  }
  return {
    annotated: true,
    variant: raw.variant,
    gene: raw.gene!,
    consequence: raw.consequence!,
    proteinChange: raw.proteinChange!,
    aouSubpopulation: raw.aouSubpopulation,
    aouAf: raw.aouAf,
    aouAc: raw.aouAc,
    aouAn: raw.aouAn,
    aouPopulations: raw.aouPopulations,
    aouAllAf: raw.aouAllAf,
    aouAllAc: raw.aouAllAc,
    aouAllAn: raw.aouAllAn,
    gnomadSubpopulation: raw.gnomadSubpopulation,
    gnomadAf: raw.gnomadAf,
    gnomadAc: raw.gnomadAc,
    gnomadAn: raw.gnomadAn,
    gnomadUrl: raw.gnomadUrl,
    gnomadPopulations: raw.gnomadPopulations,
    gnomadAllAf: raw.gnomadAllAf,
    gnomadAllAc: raw.gnomadAllAc,
    gnomadAllAn: raw.gnomadAllAn,
    clinvarSignificance: raw.clinvarSignificance,
    clinvarUrl: raw.clinvarUrl,
    clinvarStars: raw.clinvarStars,
    clinvarHasConflicts: raw.clinvarHasConflicts,
    clinvarConditions: raw.clinvarConditions,
    clinvarLastUpdated: raw.clinvarLastUpdated,
    clinvarSubmissions: raw.clinvarSubmissions,
    spliceAi: raw.spliceAi!,
    plof: raw.plof,
  };
}

function toFilteredVariantRow(raw: RawFilteredVariant): FilteredVariantRow {
  if (!raw.hasStats) {
    return { hasStats: false, variant: raw.variant, gene: raw.gene, consequence: raw.consequence };
  }
  return {
    hasStats: true,
    variant: raw.variant,
    gene: raw.gene,
    consequence: raw.consequence,
    cohortAc: raw.cohortAc!,
    cohortAn: raw.cohortAn!,
    cohortAf: raw.cohortAf!,
    homozygotes: raw.homozygotes!,
    heterozygotes: raw.heterozygotes!,
    clinvarPlpInTrans: raw.clinvarPlpInTrans!,
    afRatio: raw.afRatio!,
  };
}

// TODO remove this now that we're using a real data source
const MIN_LOAD_TIME_MS = 1000;

export interface SearchResultsQuery {
  variants: string[];
  /**
   * The concept the user picked from the dropdown. There's no free-text alternative: typed text
   * that was never picked doesn't filter anything.
   */
  conditionConceptId?: number;
}

// Keyed by request URL (which fully encodes every search criterion). Caching the in-flight promise
// -- not just the resolved result -- means two calls for the same query made back-to-back (e.g.
// React StrictMode's double-invoked mount effect in dev) share one network request instead of
// firing the BigQuery query twice. Successful results stay cached for the rest of the session;
// failures are evicted so a retry actually retries.
const cache = new Map<string, Promise<SearchResults>>();

// With no variants (or an empty list), the backend returns an empty cohortVariants -- there's
// no default browse listing.
export async function fetchSearchResults(query?: SearchResultsQuery): Promise<SearchResults> {
  const params = new URLSearchParams();
  for (const variant of query?.variants ?? []) {
    params.append("variants", variant);
  }
  if (query?.conditionConceptId !== undefined) {
    params.set("conditionConceptId", String(query.conditionConceptId));
  }
  const queryString = params.toString();
  const url = queryString ? `/api/search?${queryString}` : "/api/search";

  const cached = cache.get(url);
  if (cached) {
    return cached;
  }

  const request = fetchAndParse(url);
  request.catch(() => cache.delete(url));
  cache.set(url, request);
  return request;
}

async function fetchAndParse(url: string): Promise<SearchResults> {
  const [response] = await Promise.all([
    fetch(url),
    new Promise((resolve) => setTimeout(resolve, MIN_LOAD_TIME_MS)),
  ]);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const raw: RawSearchResultsResponse = await response.json();
  return {
    searchSummary: raw.searchSummary,
    conditionSearch: raw.conditionSearch,
    ancestryBreakdown: raw.ancestryBreakdown,
    ageBreakdown: raw.ageBreakdown,
    cohortVariants: raw.cohortVariants.map(toCohortVariantRow),
    filteredVariants: raw.filteredVariants.map(toFilteredVariantRow),
  };
}
