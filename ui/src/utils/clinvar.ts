import type { TagVariant } from "../components/results/Tag";
import colors from "../libs/colors";
import type { ClinVarSignificance } from "../types/results";

// Shared with the collapsed row's ClinVar column, so the expanded row's classification badge
// matches it exactly.
export const CLINVAR_TAG_VARIANT: Record<ClinVarSignificance, TagVariant> = {
  Pathogenic: "path",
  "Likely pathogenic": "likely-path",
  VUS: "vus",
  "Likely benign": "likely-benign",
  Benign: "benign",
};

// The aggregate badge's short label -- distinct from CLINVAR_SUBMISSION_SHORT_CODE below, which
// is keyed by an individual submission's raw (unmapped) classification string.
export const CLINVAR_SHORT_LABEL: Record<ClinVarSignificance, string> = {
  Pathogenic: "P",
  "Likely pathogenic": "LP",
  VUS: "VUS",
  "Likely benign": "LB",
  Benign: "B",
};

/** e.g. "3★". */
export function clinvarStarRating(stars: number): string {
  return `${stars}★`;
}

// Which color family the collapsed row's combined classification+stars badge uses -- shared
// between Pathogenic/Likely pathogenic (danger), Likely benign/Benign (success), and VUS
// (warning) alone.
export type ClinvarBadgeTone = "danger" | "warning" | "success";

export const CLINVAR_BADGE_TONE: Record<ClinVarSignificance, ClinvarBadgeTone> = {
  Pathogenic: "danger",
  "Likely pathogenic": "danger",
  VUS: "warning",
  "Likely benign": "success",
  Benign: "success",
};

// Short codes and colors for individual ClinVar RCV submissions. Broader than
// ClinVarSignificance -- an individual submission's raw classification can also be
// "Conflicting interpretations" or "not provided", which have no equivalent there.
const CLINVAR_SUBMISSION_SHORT_CODE: Record<string, string> = {
  Pathogenic: "P",
  "Likely pathogenic": "LP",
  "Uncertain significance": "VUS",
  "Likely benign": "LB",
  Benign: "B",
};

const CLINVAR_SUBMISSION_COLOR: Record<string, string> = {
  Pathogenic: colors.textDanger,
  "Likely pathogenic": colors.textDanger,
  "Uncertain significance": colors.textWarning,
  "Likely benign": colors.textSuccess,
  Benign: colors.textSuccess,
};

export function clinvarSubmissionShortCode(classification: string | null): string {
  if (classification === null) return "—";
  return CLINVAR_SUBMISSION_SHORT_CODE[classification] ?? classification;
}

export function clinvarSubmissionColor(classification: string | null): string {
  if (classification === null) return colors.textMuted;
  return CLINVAR_SUBMISSION_COLOR[classification] ?? colors.textMuted;
}

/** e.g. "2★ multiple submitters, no conflicts". */
export function clinvarReviewWords(stars: number, hasConflicts: boolean, _submissionCount: number): string {
  const descriptions: Record<number, string> = {
    0: "no assertion criteria provided",
    1: hasConflicts ? "criteria provided, conflicting classifications" : "criteria provided, single submitter",
    2: "criteria provided, multiple submitters, no conflicts",
    3: "reviewed by expert panel",
    4: "practice guideline",
  };
  return `${stars}★ ${descriptions[stars] ?? "unknown review status"}`;
}
