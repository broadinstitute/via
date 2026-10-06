import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AnnotatedCohortVariant, CohortVariantRow, FilteredVariantRow } from "../../types/results";
import ReviewView from "./ReviewView";

const ENRICHED: AnnotatedCohortVariant = {
  annotated: true,
  variant: "2-122517541-C-G",
  gene: "LDLR",
  consequence: "Missense",
  proteinChange: "p.Arg123Gly",
  aouSubpopulation: "AFR",
  aouAf: 0.012,
  aouAc: 24,
  aouAn: 2000,
  aouPopulations: [
    { population: "EUR", af: 0.0004, ac: 4, an: 10000 },
    { population: "AFR", af: 0.012, ac: 24, an: 2000 },
  ],
  aouAllAf: 0.0012,
  aouAllAc: 28,
  aouAllAn: 24000,
  gnomadSubpopulation: "AFR",
  gnomadAf: 0.01,
  gnomadAc: 100,
  gnomadAn: 10000,
  gnomadUrl: null,
  gnomadPopulations: [{ population: "AFR", af: 0.01, ac: 100, an: 10000 }],
  gnomadAllAf: 0.002,
  gnomadAllAc: 200,
  gnomadAllAn: 100000,
  clinvarSignificance: "Pathogenic",
  clinvarUrl: null,
  clinvarStars: 2,
  clinvarHasConflicts: false,
  clinvarConditions: [],
  clinvarLastUpdated: null,
  clinvarSubmissions: [],
  spliceAi: 0.02,
  plof: "HC",
};

const FLAT: AnnotatedCohortVariant = {
  ...ENRICHED,
  variant: "1-100-A-T",
  gene: "MYH7",
  aouSubpopulation: "EUR",
  aouAllAc: 300,
  aouAllAn: 20000,
  clinvarSignificance: null,
  plof: null,
};

const UNSEEN: CohortVariantRow = { annotated: false, variant: "7-55181378-G-A" };

const MATCHED: FilteredVariantRow[] = [
  {
    variant: "2-122517541-C-G",
    gene: "LDLR",
    consequence: "Missense",
    hasStats: true,
    cohortAc: 6,
    cohortAn: 200,
    cohortAf: 0.03,
    homozygotes: 0,
    heterozygotes: 6,
    clinvarPlpInTrans: 1,
    afRatio: 25,
  },
  {
    variant: "1-100-A-T",
    gene: "MYH7",
    consequence: "Missense",
    hasStats: true,
    cohortAc: 3,
    cohortAn: 200,
    cohortAf: 0.015,
    homozygotes: 0,
    heterozygotes: 3,
    clinvarPlpInTrans: 0,
    afRatio: 1,
  },
  { variant: "7-55181378-G-A", gene: null, consequence: null, hasStats: false },
];

const ANCESTRY = [
  { label: "EUR", count: 60, percent: 60, color: "#000" },
  { label: "AFR", count: 40, percent: 40, color: "#000" },
];

function renderView(initialVariant?: string) {
  render(
    <ReviewView
      cohortVariants={[FLAT, ENRICHED, UNSEEN]}
      filteredVariants={MATCHED}
      condition="Familial hypercholesterolemia"
      participantCount={100}
      ancestryBreakdown={ANCESTRY}
      initialVariant={initialVariant}
    />,
  );
}

describe("ReviewView", () => {
  afterEach(cleanup);

  it("opens on the best-supported signal with its verdict, evidence and the two comparison tables", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
    expect(screen.queryByText("vs. all participants")).not.toBeInTheDocument();
    const rail = screen.getByRole("navigation", { name: /best-supported first/ });
    const items = within(rail).getAllByRole("button");
    // Gene over variant, the fold change on the right: the supported signal first, the
    // three-allele row (inconclusive under the interval rule) second, nothing to compare last.
    expect(items.map((item) => item.textContent)).toEqual([
      "LDLR2-122517541-C-G26×",
      "MYH71-100-A-T1×",
      "7-55181378-G-A—",
    ]);
    expect(items[0]).toHaveAttribute("aria-current", "true");

    const verdict = screen.getByRole("status");
    expect(verdict).toHaveTextContent(/^Enriched26×/);
    expect(verdict).toHaveTextContent(
      "6 alleles observed among participants with Familial hypercholesterolemia, 0.23 expected at the cohort-wide rate: more than chance can explain.",
    );

    // Four tiles: p with its Bonferroni figure, the odds ratio with its interval, observed vs
    // expected with the ancestry-adjusted expectation, and carriers.
    const evidence = screen.getByRole("region", { name: /^Evidence/ });
    expect(evidence).toHaveTextContent("< 0.001< 0.001 after Bonferroni, 3 tests");
    expect(evidence).toHaveTextContent("3395% CI 11 – 86");
    expect(evidence).toHaveTextContent("6 vs 0.231.0 expected adjusting for ancestry");
    expect(evidence).toHaveTextContent("6 of 1000 hom · 6 het · 1 P/LP in trans");
    // The section title and each of the four tiles explain themselves.
    expect(within(evidence).getAllByRole("button", { name: "More information" })).toHaveLength(5);

    // Identity badges are labelled, and pLOF shows even when LOFTEE scored it.
    expect(screen.getAllByText("LDLR").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTitle(/ClinVar classification/)).toHaveTextContent("ClinVar");
    expect(screen.getByTitle(/LOFTEE loss-of-function call/)).toHaveTextContent("pLOFHC");

    // Head to head is a true two-column comparison: every row has both values.
    const headToHead = screen.getByRole("region", { name: /^Head to head/ });
    expect(within(headToHead).queryByText("—")).not.toBeInTheDocument();
    expect(within(headToHead).getByRole("row", { name: /^Participants/ })).toHaveTextContent("12,000100");
    expect(within(headToHead).getByRole("row", { name: /^Allele frequency/ })).toHaveTextContent("0.00120.0300");
    expect(within(headToHead).getByRole("row", { name: /^AC \/ AN/ })).toHaveTextContent("28 / 24,0006 / 200");
    expect(within(headToHead).getByRole("row", { name: /^Highest ancestry/ })).toHaveTextContent("AFR0.0120EUR60% of matched");
    expect(within(headToHead).queryByText(/gnomAD/)).not.toBeInTheDocument();

    // Only ancestry groups with a share of the cohort or a frequency are listed: EUR and AFR here, not AMR.
    expect(screen.getByRole("row", { name: /^AFR/ })).toHaveTextContent("40% (40)0.012024 / 2,0000.0100");
    expect(screen.queryByRole("row", { name: /^AMR/ })).not.toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("steps through the rail with the buttons and arrow keys, and explains a variant with nothing to compare", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Next variant" }));
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    // Three alleles can't support a verdict, whatever the point estimate.
    expect(screen.getByRole("status")).toHaveTextContent(/^Inconclusive/);
    expect(screen.getByRole("status")).toHaveTextContent(/Too few alleles to say/);
    expect(screen.getAllByText("MYH7").length).toBeGreaterThan(0);

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No comparison");
    expect(screen.getByRole("button", { name: "Next variant" })).toBeDisabled();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous variant" })).toBeDisabled();
  });

  it("can open on a given variant, and jumps on a rail click", () => {
    renderView("1-100-A-T");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /2-122517541-C-G/ }));
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });
});
