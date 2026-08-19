import type {
  BreakdownSegment,
  ClinVarSignificance,
  CohortVariantRow,
  FilteredVariantRow,
  PhenotypeCrosswalk,
  SearchSummary,
  SubpopCode,
} from "../types/results";

interface RawCohortVariant {
  variant: string;
  gene: string;
  annotated: boolean;
  classification: string | null;
  proteinChange: string | null;
  subpopulation: SubpopCode | null;
  aouAf: number | null;
  aouAc: number | null;
  aouAn: number | null;
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
  gene: string;
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
  phenotypeCrosswalk: PhenotypeCrosswalk;
  ancestryBreakdown: BreakdownSegment[];
  ageBreakdown: BreakdownSegment[];
  cohortVariants: RawCohortVariant[];
  filteredVariants: RawFilteredVariant[];
}

export interface SearchResults {
  searchSummary: SearchSummary;
  phenotypeCrosswalk: PhenotypeCrosswalk;
  ancestryBreakdown: BreakdownSegment[];
  ageBreakdown: BreakdownSegment[];
  cohortVariants: CohortVariantRow[];
  filteredVariants: FilteredVariantRow[];
}

function toCohortVariantRow(raw: RawCohortVariant): CohortVariantRow {
  if (!raw.annotated) {
    return { annotated: false, variant: raw.variant, gene: raw.gene };
  }
  return {
    annotated: true,
    variant: raw.variant,
    gene: raw.gene,
    classification: raw.classification!,
    proteinChange: raw.proteinChange!,
    subpopulation: raw.subpopulation!,
    aouAf: raw.aouAf!,
    aouAc: raw.aouAc!,
    aouAn: raw.aouAn!,
    gnomadAf: raw.gnomadAf!,
    gnomadAc: raw.gnomadAc!,
    gnomadAn: raw.gnomadAn!,
    gnomadUrl: raw.gnomadUrl!,
    clinvarSignificance: raw.clinvarSignificance!,
    clinvarUrl: raw.clinvarUrl!,
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

export async function fetchSearchResults(): Promise<SearchResults> {
  const [response] = await Promise.all([
    fetch("/api/search-results"),
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
