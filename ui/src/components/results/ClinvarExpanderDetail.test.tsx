import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AnnotatedCohortVariant } from "../../types/results";
import ClinvarExpanderDetail from "./ClinvarExpanderDetail";

function makeVariant(overrides: Partial<AnnotatedCohortVariant> = {}): AnnotatedCohortVariant {
  return {
    annotated: true,
    variant: "1-12345-A-G",
    gene: "SCN1A",
    consequence: "Missense",
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

  it("renders the ClinVar summary, badge, conditions and updated date", () => {
    render(<ClinvarExpanderDetail variant={makeVariant()} />);

    expect(screen.getAllByText("Pathogenic")[0]).toBeInTheDocument();
    expect(screen.getByText("criteria provided, multiple submitters, no conflicts")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "2 of 4 stars" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Condition A")).toBeInTheDocument();
    expect(screen.getByText("Condition B")).toBeInTheDocument();
    expect(screen.getByText("14 Feb 2024")).toBeInTheDocument();
    // The individual records are hidden for now; see ClinvarExpanderDetail.
    expect(screen.queryByText(/Records/)).not.toBeInTheDocument();
    expect(screen.queryByText(/RCV000001/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in ClinVar ↗" })).toHaveAttribute(
      "href",
      "https://www.ncbi.nlm.nih.gov/clinvar/variation/12345/",
    );
  });

  it("renders the no-consensus fallback when significance is missing", () => {
    render(<ClinvarExpanderDetail variant={makeVariant({ clinvarSignificance: null })} />);

    expect(screen.getByText("No consensus classification")).toBeInTheDocument();
  });

  it("lists conditions one per line, expanding past the first two when the disclosure is clicked", () => {
    render(
      <ClinvarExpanderDetail variant={makeVariant({ clinvarSubmissions: makeVariant().clinvarSubmissions.slice(0, 2) })} />,
    );
    expect(screen.queryByText("Condition C")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+1 more" }));

    expect(screen.getByText("Condition C")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+1 more" })).not.toBeInTheDocument();
  });

  // Skipped while ClinvarExpanderDetail's records list is hidden; turn back on with it.
  it.skip("expands additional submissions when the disclosure is clicked", () => {
    render(<ClinvarExpanderDetail variant={makeVariant({ clinvarConditions: ["Condition A"] })} />);

    fireEvent.click(screen.getByRole("button", { name: "+1 more" }));

    expect(screen.getByText(/RCV000005/)).toBeInTheDocument();
  });

  // Skipped while ClinvarExpanderDetail's records list is hidden; turn back on with it.
  it.skip("shortens long record classifications, keeping the full wording as a tooltip", () => {
    render(<ClinvarExpanderDetail variant={makeVariant()} />);

    expect(screen.getByText("VUS")).toHaveAttribute("title", "Uncertain significance");
  });

  it("omits the ClinVar link when no URL is available", () => {
    render(<ClinvarExpanderDetail variant={makeVariant({ clinvarUrl: null })} />);

    expect(screen.queryByRole("link", { name: "Open in ClinVar ↗" })).not.toBeInTheDocument();
  });
});
