export type SubpopCode = "EUR" | "AFR" | "AMR" | "EAS" | "SAS" | "MID" | "OTH";

export type GnomadSubpopCode = "AFR" | "AMR" | "EAS" | "FIN" | "NFE" | "ASJ" | "OTH" | "SAS";

export type ClinVarSignificance = "Pathogenic" | "Likely pathogenic" | "VUS" | "Likely benign" | "Benign";

export interface PopulationFrequency {
  population: SubpopCode | GnomadSubpopCode;
  af: number | null;
  ac: number | null;
  an: number | null;
}

/** One ClinVar RCV record. There's no submitter identity in the VAT, so `id` (the RCV
 * accession) is what distinguishes one submission from another. */
export interface ClinvarSubmission {
  id: string;
  classification: string | null;
  stars: number | null;
}

interface CohortVariantBase {
  variant: string;
}

export interface AnnotatedCohortVariant extends CohortVariantBase {
  annotated: true;
  gene: string;
  classification: string;
  proteinChange: string;
  /** null for all AoU fields below = this variant was not observed in All of Us. */
  aouSubpopulation: SubpopCode | null;
  aouAf: number | null;
  aouAc: number | null;
  aouAn: number | null;
  aouPopulations: PopulationFrequency[];
  aouAllAf: number | null;
  aouAllAc: number | null;
  aouAllAn: number | null;
  /** null for all gnomAD fields below = this variant was not observed in gnomAD. */
  gnomadSubpopulation: GnomadSubpopCode | null;
  gnomadAf: number | null;
  gnomadAc: number | null;
  gnomadAn: number | null;
  gnomadUrl: string | null;
  gnomadPopulations: PopulationFrequency[];
  gnomadAllAf: number | null;
  gnomadAllAc: number | null;
  gnomadAllAn: number | null;
  /** null = this variant has no ClinVar record. */
  clinvarSignificance: ClinVarSignificance | null;
  clinvarUrl: string | null;
  clinvarStars: number | null;
  clinvarHasConflicts: boolean;
  clinvarConditions: string[];
  clinvarLastEvaluated: string | null;
  clinvarSubmissions: ClinvarSubmission[];
  spliceAi: number;
  /** null = LOFTEE does not score this consequence type. */
  plof: "HC" | null;
}

/** Nothing is known about this variant — it is in no annotation or frequency source. */
export interface UnannotatedCohortVariant extends CohortVariantBase {
  annotated: false;
}

export type CohortVariantRow = AnnotatedCohortVariant | UnannotatedCohortVariant;

interface FilteredVariantBase {
  variant: string;
  /** null = nothing is known about this variant; it is in no annotation source. */
  gene: string | null;
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
