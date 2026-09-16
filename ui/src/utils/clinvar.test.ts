import colors from "../libs/colors";
import { describe, expect, it } from "vitest";
import {
  CLINVAR_BADGE_CONFIG,
  clinvarReviewWords,
  clinvarSubmissionColor,
  clinvarSubmissionShortCode,
} from "./clinvar";

describe("clinvar utils", () => {
  it("exposes the expected badge config for each aggregate ClinVar significance", () => {
    expect(CLINVAR_BADGE_CONFIG.Pathogenic).toEqual({
      shortLabel: "P",
      ink: colors.textDanger,
      fill: colors.bgDanger,
      borderStyle: "solid",
      tagPadding: "1px 6px",
    });
    expect(CLINVAR_BADGE_CONFIG["Likely pathogenic"]).toEqual({
      shortLabel: "LP",
      ink: colors.textDanger,
      fill: colors.bgDanger,
      borderStyle: "dashed",
      tagPadding: "2px 7px",
    });
    expect(CLINVAR_BADGE_CONFIG.VUS).toEqual({
      shortLabel: "VUS",
      ink: colors.textWarning,
      fill: colors.bgWarning,
      borderStyle: "solid",
      tagPadding: "2px 7px",
    });
    expect(CLINVAR_BADGE_CONFIG["Likely benign"]).toEqual({
      shortLabel: "LB",
      ink: colors.textSuccess,
      fill: colors.bgSuccess,
      borderStyle: "dashed",
      tagPadding: "2px 7px",
    });
    expect(CLINVAR_BADGE_CONFIG.Benign).toEqual({
      shortLabel: "B",
      ink: colors.textSuccess,
      fill: colors.bgSuccess,
      borderStyle: "solid",
      tagPadding: "1px 6px",
    });
  });

  it("maps known submission classifications to short codes", () => {
    expect(clinvarSubmissionShortCode("Pathogenic")).toBe("P");
    expect(clinvarSubmissionShortCode("Likely pathogenic")).toBe("LP");
    expect(clinvarSubmissionShortCode("Uncertain significance")).toBe("VUS");
    expect(clinvarSubmissionShortCode("Likely benign")).toBe("LB");
    expect(clinvarSubmissionShortCode("Benign")).toBe("B");
  });

  it("falls back for missing or unknown submission classifications", () => {
    expect(clinvarSubmissionShortCode(null)).toBe("—");
    expect(clinvarSubmissionShortCode("Conflicting interpretations")).toBe("Conflicting interpretations");
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

  it("formats review words for each supported star level", () => {
    expect(clinvarReviewWords(0, false, 1)).toBe("0★ no assertion criteria provided");
    expect(clinvarReviewWords(1, false, 1)).toBe("1★ criteria provided, single submitter");
    expect(clinvarReviewWords(1, true, 2)).toBe("1★ criteria provided, conflicting classifications");
    expect(clinvarReviewWords(2, false, 3)).toBe("2★ criteria provided, multiple submitters, no conflicts");
    expect(clinvarReviewWords(3, false, 1)).toBe("3★ reviewed by expert panel");
    expect(clinvarReviewWords(4, false, 1)).toBe("4★ practice guideline");
  });

  it("falls back to an unknown review status for out-of-range star counts", () => {
    expect(clinvarReviewWords(9, false, 1)).toBe("9★ unknown review status");
  });
});
