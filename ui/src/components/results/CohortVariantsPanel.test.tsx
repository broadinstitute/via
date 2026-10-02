import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AnnotatedCohortVariant, CohortVariantRow } from "../../types/results";
import { resetDataViewOptionsForTests, setDataViewOptions } from "../../utils/dataViewOptions";
import CohortVariantsPanel from "./CohortVariantsPanel";

/** A cell by its full text, which can span elements (the italic program name). */
const cellWithText = (text: string) => (_: string, element: Element | null) =>
  element?.tagName === "TD" && element.textContent === text;

// In All of Us, but not in gnomAD.
const IN_AOU_ONLY: AnnotatedCohortVariant = {
  annotated: true,
  variant: "18-143274802-C-A",
  gene: "BRCA1",
  consequence: "Missense",
  proteinChange: "p.Val354Pro",
  aouSubpopulation: "AMR",
  aouAf: 0.0219,
  aouAc: 1213,
  aouAn: 55388,
  aouPopulations: [],
  aouAllAf: 0.0135,
  aouAllAc: 6528,
  aouAllAn: 484144,
  gnomadSubpopulation: null,
  gnomadAf: null,
  gnomadAc: null,
  gnomadAn: null,
  gnomadUrl: null,
  gnomadPopulations: [],
  gnomadAllAf: null,
  gnomadAllAc: null,
  gnomadAllAn: null,
  clinvarSignificance: null,
  clinvarUrl: null,
  clinvarStars: null,
  clinvarHasConflicts: false,
  clinvarConditions: [],
  clinvarLastUpdated: null,
  clinvarSubmissions: [],
  spliceAi: 0.042,
  plof: null,
};

const NOT_IN_AOU: CohortVariantRow = { annotated: false, variant: "7-55181378-G-A" };

describe("CohortVariantsPanel", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    resetDataViewOptionsForTests();
  });

  it("leaves hidden columns out, including a whole source group, and spans merged cells over what's left", () => {
    setDataViewOptions({ hiddenColumns: ["cohort.gnomad", "cohort.gene"] });
    render(<CohortVariantsPanel rows={[NOT_IN_AOU]} />);

    expect(screen.queryByText("gnomAD")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Gene" })).not.toBeInTheDocument();
    // Twelve spanned columns, less gnomAD's three and Gene.
    expect(screen.getByText(cellWithText("Not observed in All of Us"))).toHaveAttribute("colspan", "8");
  });

  it("spans a variant that isn't in All of Us with one message, not a claim about gnomAD", () => {
    render(<CohortVariantsPanel rows={[NOT_IN_AOU]} />);

    const message = screen.getByText(cellWithText("Not observed in All of Us"));
    // Gene through pLOF: three annotation, six source and three more annotation columns.
    expect(message).toHaveAttribute("colspan", "12");
    expect(message.getAttribute("title")).toMatch(/only includes variants observed in All of Us/);
    expect(screen.queryByText("Not observed in gnomAD")).not.toBeInTheDocument();
  });

  it("still says not observed in gnomAD for a variant All of Us has but gnomAD doesn't", () => {
    render(<CohortVariantsPanel rows={[IN_AOU_ONLY]} />);

    expect(screen.getByText("Not observed in gnomAD")).toBeInTheDocument();
    expect(screen.queryByText(cellWithText("Not observed in All of Us"))).not.toBeInTheDocument();
    expect(screen.getByText("BRCA1")).toBeInTheDocument();
  });

  it("points a variant that isn't in All of Us to gnomAD and ClinVar when expanded", () => {
    render(<CohortVariantsPanel rows={[NOT_IN_AOU]} />);

    fireEvent.click(screen.getByRole("button", { name: "Expand row for more detail" }));

    expect(screen.getByText(/This variant may still be in gnomAD or ClinVar/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Look up in gnomAD ↗" })).toHaveAttribute(
      "href",
      "https://gnomad.broadinstitute.org/variant/7-55181378-G-A",
    );
    expect(screen.getByRole("link", { name: "Look up in ClinVar ↗" })).toHaveAttribute(
      "href",
      "https://www.ncbi.nlm.nih.gov/clinvar/?term=7-55181378-G-A",
    );
  });
});
