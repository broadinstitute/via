import type { TagVariant } from "../components/results/Tag";
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

const CLINVAR_SUBMISSION_COLOR_VAR: Record<string, string> = {
  Pathogenic: "var(--text-danger)",
  "Likely pathogenic": "var(--text-danger)",
  "Uncertain significance": "var(--text-warning)",
  "Likely benign": "var(--text-success)",
  Benign: "var(--text-success)",
};

export function clinvarSubmissionShortCode(classification: string | null): string {
  if (classification === null) return "—";
  return CLINVAR_SUBMISSION_SHORT_CODE[classification] ?? classification;
}

export function clinvarSubmissionColor(classification: string | null): string {
  if (classification === null) return "var(--text-muted)";
  return CLINVAR_SUBMISSION_COLOR_VAR[classification] ?? "var(--text-muted)";
}

/** e.g. "2★ multiple submitters, no conflicts". */
export function clinvarReviewWords(stars: number, hasConflicts: boolean, submissionCount: number): string {
  const description =
    submissionCount <= 1
      ? "single submitter"
      : hasConflicts
        ? "multiple submitters, conflicting classifications"
        : "multiple submitters, no conflicts";
  return `${stars}★ ${description}`;
}
