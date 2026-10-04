import colors from "../libs/colors";
import type { ClinVarSignificance } from "../types/results";

export interface ClinvarBadgeConfig {
  shortLabel: string;
  ink: string;
  fill: string;
  /** Pathogenic and Benign, as opposed to their "likely" neighbours, which the badge marks with a hollow dot. */
  definitive: boolean;
}

interface ClinvarSubmissionDisplay {
  shortCode: string;
  color: string;
}

// The aggregate badge config for both row and detail badges. Distinct from
// CLINVAR_SUBMISSION_SHORT_CODE below, which is keyed by an individual submission's raw
// (unmapped) classification string.
export const CLINVAR_BADGE_CONFIG: Record<ClinVarSignificance, ClinvarBadgeConfig> = {
  Pathogenic: {
    shortLabel: "P",
    ink: colors.textDanger,
    fill: colors.bgDanger,
    definitive: true,
  },
  "Likely pathogenic": {
    shortLabel: "LP",
    ink: colors.textDanger,
    fill: colors.bgDanger,
    definitive: false,
  },
  VUS: {
    shortLabel: "VUS",
    ink: colors.textWarning,
    fill: colors.bgWarning,
    definitive: true,
  },
  "Likely benign": {
    shortLabel: "LB",
    ink: colors.textSuccess,
    fill: colors.bgSuccess,
    definitive: false,
  },
  Benign: {
    shortLabel: "B",
    ink: colors.textSuccess,
    fill: colors.bgSuccess,
    definitive: true,
  },
};

// Short codes and colors for individual ClinVar RCV submissions. Broader than
// ClinVarSignificance -- an individual submission's raw classification can also be
// "Conflicting interpretations" or "not provided", which have no equivalent there.
const CLINVAR_SUBMISSION_DISPLAY: Record<string, ClinvarSubmissionDisplay> = {
  Pathogenic: { shortCode: "P", color: colors.textDanger },
  "Likely pathogenic": { shortCode: "LP", color: colors.textDanger },
  "Uncertain significance": { shortCode: "VUS", color: colors.textWarning },
  "Likely benign": { shortCode: "LB", color: colors.textSuccess },
  Benign: { shortCode: "B", color: colors.textSuccess },
};

export function clinvarSubmissionShortCode(classification: string | null): string {
  if (classification === null) return "—";
  return CLINVAR_SUBMISSION_DISPLAY[classification]?.shortCode ?? classification;
}

// Record classifications long enough to crowd a narrow list, shortened to the terms clinicians
// already use; the rest read fine in full.
const CLINVAR_SUBMISSION_LABELS: Record<string, string> = {
  "Uncertain significance": "VUS",
  "Conflicting interpretations": "Conflicting",
};

/** A record's classification, shortened where the full wording is long. */
export function clinvarSubmissionLabel(classification: string | null): string {
  if (classification === null) return "Not provided";
  return CLINVAR_SUBMISSION_LABELS[classification] ?? classification;
}

export function clinvarSubmissionColor(classification: string | null): string {
  if (classification === null) return colors.textMuted;
  return CLINVAR_SUBMISSION_DISPLAY[classification]?.color ?? colors.textMuted;
}

/** ClinVar's highest review status: a practice guideline. */
export const CLINVAR_MAX_STARS = 4;

/** e.g. "criteria provided, multiple submitters, no conflicts", for a star rating shown separately. */
export function clinvarReviewDescription(stars: number, hasConflicts: boolean): string {
  const descriptions: Record<number, string> = {
    0: "no assertion criteria provided",
    1: hasConflicts ? "criteria provided, conflicting classifications" : "criteria provided, single submitter",
    2: "criteria provided, multiple submitters, no conflicts",
    3: "reviewed by expert panel",
    4: "practice guideline",
  };
  return descriptions[stars] ?? "unknown review status";
}

/** e.g. "2★ multiple submitters, no conflicts". */
export function clinvarReviewWords(stars: number, hasConflicts: boolean, _submissionCount: number): string {
  return `${stars}★ ${clinvarReviewDescription(stars, hasConflicts)}`;
}
