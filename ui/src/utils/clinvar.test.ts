import colors from "../libs/colors";
import { describe, expect, it } from "vitest";
import {
  CLINVAR_BADGE_CONFIG,
  clinvarReviewDescription,
  clinvarSubmissionColor,
  clinvarSubmissionLabel,
} from "./clinvar";

describe("clinvar utils", () => {
  it("exposes the expected badge config for each aggregate ClinVar significance", () => {
    expect(CLINVAR_BADGE_CONFIG.Pathogenic).toEqual({
      shortLabel: "P",
      ink: colors.textDanger,
      fill: colors.bgDanger,
    });
    expect(CLINVAR_BADGE_CONFIG["Likely pathogenic"]).toEqual({
      shortLabel: "LP",
      ink: colors.textDanger,
      fill: colors.bgDanger,
    });
    expect(CLINVAR_BADGE_CONFIG.VUS).toEqual({
      shortLabel: "VUS",
      ink: colors.textWarning,
      fill: colors.bgWarning,
    });
    expect(CLINVAR_BADGE_CONFIG["Likely benign"]).toEqual({
      shortLabel: "LB",
      ink: colors.textSuccess,
      fill: colors.bgSuccess,
    });
    expect(CLINVAR_BADGE_CONFIG.Benign).toEqual({
      shortLabel: "B",
      ink: colors.textSuccess,
      fill: colors.bgSuccess,
    });
  });

  it("maps known submission classifications to their display colors", () => {
    expect(clinvarSubmissionColor("Pathogenic")).toBe(colors.textDanger);
    expect(clinvarSubmissionColor("Likely pathogenic")).toBe(colors.textDanger);
    expect(clinvarSubmissionColor("Uncertain significance")).toBe(colors.textWarning);
    expect(clinvarSubmissionColor("Likely benign")).toBe(colors.textSuccess);
    expect(clinvarSubmissionColor("Benign")).toBe(colors.textSuccess);
  });

  it("falls back to muted ink for missing or unknown submission classifications", () => {
    expect(clinvarSubmissionColor(null)).toBe(colors.textMuted);
    expect(clinvarSubmissionColor("Conflicting interpretations")).toBe(colors.textMuted);
  });

  it("describes each review status, and falls back for an out-of-range star count", () => {
    expect(clinvarReviewDescription(0, false)).toBe("no assertion criteria provided");
    expect(clinvarReviewDescription(1, false)).toBe("criteria provided, single submitter");
    expect(clinvarReviewDescription(1, true)).toBe("criteria provided, conflicting classifications");
    expect(clinvarReviewDescription(2, false)).toBe("criteria provided, multiple submitters, no conflicts");
    expect(clinvarReviewDescription(3, false)).toBe("reviewed by expert panel");
    expect(clinvarReviewDescription(4, false)).toBe("practice guideline");
    expect(clinvarReviewDescription(9, false)).toBe("unknown review status");
  });

  it("shortens only the record classifications too long for a narrow list", () => {
    expect(clinvarSubmissionLabel("Uncertain significance")).toBe("VUS");
    expect(clinvarSubmissionLabel("Conflicting interpretations")).toBe("Conflicting");
    expect(clinvarSubmissionLabel("Likely pathogenic")).toBe("Likely pathogenic");
    expect(clinvarSubmissionLabel(null)).toBe("Not provided");
  });
});
