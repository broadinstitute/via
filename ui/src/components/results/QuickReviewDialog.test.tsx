import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnnotatedCohortVariant, CohortVariantRow, FilteredVariantRow } from "../../types/results";
import QuickReviewDialog from "./QuickReviewDialog";

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

function renderDialog(onClose = vi.fn(), initialVariant?: string) {
  render(
    <QuickReviewDialog
      cohortVariants={[FLAT, ENRICHED, UNSEEN]}
      filteredVariants={MATCHED}
      condition="Familial hypercholesterolemia"
      participantCount={100}
      ancestryBreakdown={ANCESTRY}
      initialVariant={initialVariant}
      onClose={onClose}
    />,
  );
  return onClose;
}

describe("QuickReviewDialog", () => {
  afterEach(cleanup);

  it("opens on the strongest signal with its verdict, counts and ancestry context", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Quick review" })).toBeInTheDocument();
    const rail = screen.getByRole("navigation", { name: /strongest signal first/ });
    const items = within(rail).getAllByRole("button");
    expect(items.map((item) => item.textContent)).toEqual([
      "2-122517541-C-G25.7×",
      "1-100-A-T1.0×",
      "7-55181378-G-A—",
    ]);
    expect(items[0]).toHaveAttribute("aria-current", "true");

    const verdict = screen.getByRole("status");
    expect(verdict).toHaveTextContent(/^Enriched25\.7×/);
    expect(verdict).not.toHaveTextContent("Fisher");
    // The evidence sits in its own section, as labeled figures.
    const evidence = screen.getByRole("region", { name: /^Evidence/ });
    expect(evidence).toHaveTextContent("Fisher's exact p< 0.001below 0.05");
    expect(evidence).toHaveTextContent(/95% CI for ratio.*excludes 1×/);
    expect(evidence).toHaveTextContent("Matched alt alleles60.23 expected at cohort rate");
    expect(screen.getByText("LDLR")).toBeInTheDocument();
    expect(screen.getByText("6 / 200")).toBeInTheDocument();
    expect(screen.getByText("28 / 24,000")).toBeInTheDocument();
    expect(screen.getByText("pLOF HC")).toBeInTheDocument();
    // The insight pairs where the variant is common with who the matched cohort is.
    expect(screen.getByText(/most frequent in African\/African American participants/)).toHaveTextContent(
      /The matched cohort is 60% European, where its frequency is 0\.0004\./,
    );
    // The two cohorts line up row by row.
    expect(screen.getByRole("columnheader", { name: /Phenotype-matched\s*100 with Familial hypercholesterolemia/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^Allele frequency/ })).toHaveTextContent("0.00120.0300");
    // Only ancestry groups with a share of the cohort or a frequency are listed: EUR and AFR here, not AMR.
    expect(screen.getByRole("row", { name: /^AFR/ })).toHaveTextContent("40% (40)0.012024 / 2,0000.0100");
    expect(screen.queryByRole("row", { name: /^AMR/ })).not.toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("steps through the rail with the buttons and arrow keys, and explains a variant with nothing to compare", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Next variant" }));
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/^Similar frequency/);
    expect(screen.getByText("MYH7")).toBeInTheDocument();

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
    renderDialog(vi.fn(), "1-100-A-T");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^2-122517541-C-G/ }));
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("closes from the close button, Escape and the backdrop", () => {
    const onClose = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Close quick review" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    fireEvent.click(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
