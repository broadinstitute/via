import type { ClinVarSignificance } from "../types/results";

export type ClinvarColorTier = "pathogenic" | "uncertain" | "benign" | "neutral";

// Covers both the aggregate ClinVarSignificance values and the raw per-submission strings
// (which can include values like "Conflicting interpretations" or "not provided" that never
// made it into the aggregate enum).
const KNOWN_TIER: Record<string, ClinvarColorTier> = {
  Pathogenic: "pathogenic",
  "Likely pathogenic": "pathogenic",
  VUS: "uncertain",
  "Uncertain significance": "uncertain",
  "Conflicting interpretations": "uncertain",
  "Likely benign": "benign",
  Benign: "benign",
};

export function clinvarColorTier(rawClassification: string | null | undefined): ClinvarColorTier {
  if (!rawClassification) return "neutral";
  return KNOWN_TIER[rawClassification] ?? "neutral";
}

/** VUS reads as "Uncertain"; everything else is shown verbatim. */
export function clinvarLabel(significance: ClinVarSignificance): string {
  return significance === "VUS" ? "Uncertain" : significance;
}

export interface ClinvarReviewStatus {
  stars: number;
  hasConflicts: boolean;
}

// Spelled-out review status, for the expander's definition list.
export function clinvarReviewWords({ stars, hasConflicts }: ClinvarReviewStatus): string {
  if (hasConflicts) {
    return "Criteria provided, conflicting classifications";
  }
  switch (stars) {
    case 4:
      return "Practice guideline";
    case 3:
      return "Reviewed by expert panel";
    case 2:
      return "Criteria provided, multiple submitters, no conflicts";
    case 1:
      return "Criteria provided, single submitter";
    default:
      return "No assertion criteria provided";
  }
}

// Compact review status, for the row cell: named tiers for 4/3 stars (the ones a curator acts
// on), a bare "N★" for the low-signal middle of the scale, "conflicting" overriding all of it.
export function clinvarReviewShort({ stars, hasConflicts }: ClinvarReviewStatus): string {
  if (hasConflicts) {
    return "conflicting";
  }
  if (stars === 4) {
    return "practice guideline";
  }
  if (stars === 3) {
    return "expert panel";
  }
  return `${stars}★`;
}
