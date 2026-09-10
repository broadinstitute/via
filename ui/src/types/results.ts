export type SubpopCode = "EUR" | "AFR" | "AMR" | "EAS" | "SAS" | "MID" | "OTH";

export type GnomadSubpopCode = "AFR" | "AMR" | "EAS" | "FIN" | "NFE" | "ASJ" | "OTH" | "SAS";

export type ClinVarSignificance = "Pathogenic" | "Likely pathogenic" | "VUS" | "Likely benign" | "Benign";

export interface PopulationFrequency {
  population: string;
  af: number | null;
  ac: number | null;
  an: number | null;
}

export interface ClinvarSubmission {
  /** ClinVar RCV accession -- there's no submitter identity in the underlying data. */
  id: string;
  /** This submission's own classification, verbatim from ClinVar (not narrowed to ClinVarSignificance). */
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
  /** ISO date string (e.g. "2024-02-14"). */
  clinvarLastEvaluated: string | null;
  clinvarSubmissions: ClinvarSubmission[];
  spliceAi: number;
  spliceAiAcceptorGain: number | null;
  spliceAiAcceptorLoss: number | null;
  spliceAiDonorGain: number | null;
  spliceAiDonorLoss: number | null;
  /** null = LOFTEE does not score this consequence type. */
  plof: "HC" | null;
  /** Raw LOFTEE confidence call, for the expanded row; null whenever plof is null. */
  plofConfidence: "HC" | "LC" | null;
  lofFlags: string[];
  transcript: string | null;
  /** Raw "N/total" format (e.g. "4/19"). */
  exonNumber: string | null;
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
