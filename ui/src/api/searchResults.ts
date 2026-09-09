import type {
  BreakdownSegment,
  ClinVarSignificance,
  CohortVariantRow,
  FilteredVariantRow,
  GnomadSubpopCode,
  PhenotypeCrosswalk,
  SearchSummary,
  SubpopCode,
} from "../types/results";

interface RawCohortVariant {
  variant: string;
  gene: string | null;
  annotated: boolean;
  classification: string | null;
  proteinChange: string | null;
  aouSubpopulation: SubpopCode | null;
  aouAf: number | null;
  aouAc: number | null;
  aouAn: number | null;
  gnomadSubpopulation: GnomadSubpopCode | null;
  gnomadAf: number | null;
  gnomadAc: number | null;
  gnomadAn: number | null;
  gnomadUrl: string | null;
  clinvarSignificance: ClinVarSignificance | null;
  clinvarUrl: string | null;
  spliceAi: number | null;
  plof: "HC" | null;
}

interface RawFilteredVariant {
  variant: string;
  gene: string | null;
  classification: string | null;
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
  // Null when no HPO term was given -- ancestryBreakdown, ageBreakdown, and filteredVariants
  // are all empty in that case too.
  phenotypeCrosswalk: PhenotypeCrosswalk | null;
  ancestryBreakdown: BreakdownSegment[];
  ageBreakdown: BreakdownSegment[];
  cohortVariants: RawCohortVariant[];
  filteredVariants: RawFilteredVariant[];
}

export interface SearchResults {
  searchSummary: SearchSummary;
  phenotypeCrosswalk: PhenotypeCrosswalk | null;
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
    classification: raw.classification!,
    proteinChange: raw.proteinChange!,
    aouSubpopulation: raw.aouSubpopulation,
    aouAf: raw.aouAf,
    aouAc: raw.aouAc,
    aouAn: raw.aouAn,
    gnomadSubpopulation: raw.gnomadSubpopulation,
    gnomadAf: raw.gnomadAf,
    gnomadAc: raw.gnomadAc,
    gnomadAn: raw.gnomadAn,
    gnomadUrl: raw.gnomadUrl,
    clinvarSignificance: raw.clinvarSignificance,
    clinvarUrl: raw.clinvarUrl,
    spliceAi: raw.spliceAi!,
    plof: raw.plof,
  };
}

function toFilteredVariantRow(raw: RawFilteredVariant): FilteredVariantRow {
  if (!raw.hasStats) {
    return { hasStats: false, variant: raw.variant, gene: raw.gene, classification: raw.classification };
  }
  return {
    hasStats: true,
    variant: raw.variant,
    gene: raw.gene,
    classification: raw.classification,
    cohortAc: raw.cohortAc!,
    cohortAn: raw.cohortAn!,
    cohortAf: raw.cohortAf!,
    homozygotes: raw.homozygotes!,
    heterozygotes: raw.heterozygotes!,
    clinvarPlpInTrans: raw.clinvarPlpInTrans!,
    afRatio: raw.afRatio!,
  };
}

// Real fetch is fast enough that the loading state would never be visible;
// this floors it at 1s so the spinner/loading UI actually has time to show.
const MIN_LOAD_TIME_MS = 1000;

export interface SearchResultsQuery {
  variants: string[];
  hpoTerm: string;
}

// Keyed by request URL (which fully encodes variants + hpoTerm). Caching the in-flight promise
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
  if (query?.hpoTerm) {
    params.set("hpoTerm", query.hpoTerm);
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
    phenotypeCrosswalk: raw.phenotypeCrosswalk,
    ancestryBreakdown: raw.ancestryBreakdown,
    ageBreakdown: raw.ageBreakdown,
    cohortVariants: raw.cohortVariants.map(toCohortVariantRow),
    filteredVariants: raw.filteredVariants.map(toFilteredVariantRow),
  };
}
