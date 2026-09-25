import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AnnotatedCohortVariant } from "../../types/results";
import ClinvarExpanderDetail from "./ClinvarExpanderDetail";

function makeVariant(overrides: Partial<AnnotatedCohortVariant> = {}): AnnotatedCohortVariant {
  return {
    annotated: true,
    variant: "1-12345-A-G",
    gene: "SCN1A",
    classification: "missense_variant",
    proteinChange: "p.Arg1Gly",
    aouSubpopulation: "EUR",
    aouAf: 0.001,
    aouAc: 1,
    aouAn: 1000,
    aouPopulations: [],
    aouAllAf: 0.001,
    aouAllAc: 1,
    aouAllAn: 1000,
    gnomadSubpopulation: "NFE",
    gnomadAf: 0.002,
    gnomadAc: 2,
    gnomadAn: 1000,
    gnomadUrl: "https://gnomad.broadinstitute.org/variant/1-12345-A-G",
    gnomadPopulations: [],
    gnomadAllAf: 0.002,
    gnomadAllAc: 2,
    gnomadAllAn: 1000,
    clinvarSignificance: "Pathogenic",
    clinvarUrl: "https://www.ncbi.nlm.nih.gov/clinvar/variation/12345/",
    clinvarStars: 2,
    clinvarHasConflicts: false,
    clinvarConditions: ["Condition A", "Condition B", "Condition C"],
    clinvarLastUpdated: "2024-02-14",
    clinvarSubmissions: [
      { id: "RCV000001", classification: "Pathogenic", stars: 2 },
      { id: "RCV000002", classification: "Likely pathogenic", stars: 1 },
      { id: "RCV000003", classification: "Uncertain significance", stars: 1 },
      { id: "RCV000004", classification: "Likely benign", stars: 1 },
      { id: "RCV000005", classification: "Benign", stars: 1 },
    ],
    spliceAi: 0.12,
    plof: "HC",
    plofFilters: [],
    plofFlags: [],
    ...overrides,
  };
}

describe("ClinvarExpanderDetail", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the empty state when there are no ClinVar submissions", () => {
    render(<ClinvarExpanderDetail variant={makeVariant({ clinvarSubmissions: [] })} />);

    expect(screen.getByText("ClinVar")).toBeInTheDocument();
    expect(screen.getByText("No ClinVar submissions for this variant.")).toBeInTheDocument();
  });

  it("renders the ClinVar summary, badge, updated date, and visible submissions", () => {
    render(<ClinvarExpanderDetail variant={makeVariant()} />);

    expect(screen.getByText("Pathogenic")).toBeInTheDocument();
    expect(screen.getByText("2★ criteria provided, multiple submitters, no conflicts")).toBeInTheDocument();
    expect(screen.getByText("Condition A")).toBeInTheDocument();
    expect(screen.getByText("14 Feb 2024")).toBeInTheDocument();
    expect(screen.getByText(/RCV000001/)).toBeInTheDocument();
    expect(screen.getByText(/RCV000004/)).toBeInTheDocument();
    expect(screen.queryByText(/RCV000005/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in ClinVar ↗" })).toHaveAttribute(
      "href",
      "https://www.ncbi.nlm.nih.gov/clinvar/variation/12345/",
    );
  });

  it("renders the no-consensus fallback when significance is missing", () => {
    render(<ClinvarExpanderDetail variant={makeVariant({ clinvarSignificance: null })} />);

    expect(screen.getByText("No consensus classification")).toBeInTheDocument();
  });

  it("expands additional conditions when the disclosure is clicked", () => {
    render(<ClinvarExpanderDetail variant={makeVariant()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "+2 more" })[0]);

    expect(screen.getByText(/Condition A, Condition B, Condition C/)).toBeInTheDocument();
  });

  it("expands additional submissions when the disclosure is clicked", () => {
    render(<ClinvarExpanderDetail variant={makeVariant()} />);

    fireEvent.click(screen.getByRole("button", { name: /\+\s*1\s*more/ }));

    expect(screen.getByText(/RCV000005/)).toBeInTheDocument();
  });

  it("omits the ClinVar link when no URL is available", () => {
    render(<ClinvarExpanderDetail variant={makeVariant({ clinvarUrl: null })} />);

    expect(screen.queryByRole("link", { name: "Open in ClinVar ↗" })).not.toBeInTheDocument();
  });
});
