export type SubpopCode = "EUR" | "AFR" | "AMR" | "EAS" | "SAS" | "MID" | "OTH";

export type GnomadSubpopCode = "AFR" | "AMR" | "EAS" | "FIN" | "NFE" | "ASJ" | "OTH" | "SAS";

export type ClinVarSignificance = "Pathogenic" | "VUS" | "Benign";

interface CohortVariantBase {
  variant: string;
  gene: string;
}

export interface AnnotatedCohortVariant extends CohortVariantBase {
  annotated: true;
  classification: string;
  proteinChange: string;
  aouSubpopulation: SubpopCode;
  aouAf: number;
  aouAc: number;
  aouAn: number;
  /** null for all gnomAD fields below = this variant was not observed in gnomAD. */
  gnomadSubpopulation: GnomadSubpopCode | null;
  gnomadAf: number | null;
  gnomadAc: number | null;
  gnomadAn: number | null;
  gnomadUrl: string | null;
  clinvarSignificance: ClinVarSignificance;
  clinvarUrl: string;
  spliceAi: number;
  /** null = LOFTEE does not score this consequence type. */
  plof: "HC" | null;
}

export interface UnannotatedCohortVariant extends CohortVariantBase {
  annotated: false;
}

export type CohortVariantRow = AnnotatedCohortVariant | UnannotatedCohortVariant;

interface FilteredVariantBase {
  variant: string;
  gene: string;
  /** Some variants have consequence annotation even when cohort-filtered stats don't exist yet. */
  classification: string | null;
}

export interface FilteredVariantWithStats extends FilteredVariantBase {
  hasStats: true;
  cohortAc: number;
  cohortAn: number;
  cohortAf: number;
  homozygotes: number;
  heterozygotes: number;
  clinvarPlpInTrans: number;
  afRatio: number;
}

export interface FilteredVariantWithoutStats extends FilteredVariantBase {
  hasStats: false;
}

export type FilteredVariantRow = FilteredVariantWithStats | FilteredVariantWithoutStats;

export interface BreakdownSegment {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface PhenotypeCrosswalk {
  hpoCode: string;
  omopCode: string;
  description: string;
  participantCount: number;
}

export interface SearchSummary {
  variantsRaw: string;
  variantsEnteredCount: number;
  variantsLimit: number;
  hpoTerm: string;
}
