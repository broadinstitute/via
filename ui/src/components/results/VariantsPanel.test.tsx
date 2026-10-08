import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnnotatedCohortVariant, CohortVariantRow, FilteredVariantRow } from "../../types/results";
import VariantsPanel from "./VariantsPanel";

/** A cell by its full text, which can span elements (the italic program name). */
const cellWithText = (text: string) => (_: string, element: Element | null) =>
  element?.tagName === "TD" && element.textContent === text;

// In All of Us, but not in gnomAD.
const IN_AOU_ONLY: AnnotatedCohortVariant = {
  annotated: true,
  variant: "2-122517541-C-G",
  gene: "LDLR",
  consequence: "Missense",
  proteinChange: "p.Arg123Gly",
  aouSubpopulation: "AFR",
  aouAf: 0.012,
  aouAc: 24,
  aouAn: 2000,
  aouPopulations: [{ population: "AFR", af: 0.012, ac: 24, an: 2000 }],
  aouAllAf: 0.0012,
  aouAllAc: 28,
  aouAllAn: 24000,
  gnomadSubpopulation: null,
  gnomadAf: null,
  gnomadAc: null,
  gnomadAn: null,
  gnomadPopulations: [],
  gnomadAllAf: null,
  gnomadAllAc: null,
  gnomadAllAn: null,
  clinvarSignificance: "Pathogenic",
  clinvarStars: 2,
  clinvarHasConflicts: false,
  clinvarConditions: [],
  clinvarLastUpdated: null,
  clinvarSubmissions: [],
  spliceAi: 0.042,
  plof: null,
};

const NOT_IN_AOU: CohortVariantRow = { annotated: false, variant: "7-55181378-G-A" };

const MATCHED: FilteredVariantRow = {
  variant: "2-122517541-C-G",
  gene: "LDLR",
  consequence: "Missense",
  hasStats: true,
  cohortAc: 2,
  cohortAn: 98,
  cohortAf: 0.0204,
  homozygotes: 0,
  heterozygotes: 2,
  clinvarPlpInTrans: 0,
  afRatio: 1.5,
};

const NOT_MATCHED: FilteredVariantRow = { variant: "7-55181378-G-A", gene: null, consequence: null, hasStats: false };

function renderPanel(
  cohortVariants: CohortVariantRow[],
  filteredVariants: FilteredVariantRow[],
  props: Partial<React.ComponentProps<typeof VariantsPanel>> = {},
) {
  render(
    <VariantsPanel
      cohortVariants={cohortVariants}
      filteredVariants={filteredVariants}
      hasPhenotypeFilter={filteredVariants.length > 0}
      participantCount={49}
      condition="Tetralogy of Fallot"
      {...props}
    />,
  );
}

describe("VariantsPanel", () => {
  afterEach(cleanup);

  it("puts the cohort-wide and matched figures for a variant in one row, annotations last", () => {
    renderPanel([IN_AOU_ONLY], [MATCHED]);

    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent?.trim());
    expect(headers.indexOf("ClinVar")).toBeGreaterThan(headers.findIndex((h) => h?.startsWith("P/LP in trans")));

    const row = screen.getByText("2-122517541-C-G").closest("tr")!;
    expect(row).toHaveTextContent("LDLR");
    // The protein change rides under the consequence in one pinned cell.
    expect(within(row).getByText("Missense").closest("td")).toHaveTextContent("Missensep.Arg123Gly");
    expect(row).toHaveTextContent("24 / 2,000");
    expect(row).toHaveTextContent("Not observed in gnomAD");
    // The frequency sits over its counts in one cell.
    const matchedFreq = within(row).getByText("0.0204").closest("td")!;
    expect(matchedFreq).toHaveTextContent("0.02042 / 98");
    expect(within(row).getByText("0.0120").closest("td")).toHaveTextContent("0.012024 / 2,000");
    // The ClinVar badge opens the variant's ClinVar page; with no URL from the backend, a search for it.
    expect(within(row).getByRole("link", { name: /^ClinVar: Pathogenic/ })).toHaveAttribute(
      "href",
      "https://www.ncbi.nlm.nih.gov/clinvar/?term=2-122517541-C-G",
    );
    expect(screen.getAllByRole("columnheader", { name: "Subpopulation" })).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: /^Hom/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Het/ })).toBeInTheDocument();
    expect(row).not.toHaveTextContent("0 / 2");
    expect(screen.queryByRole("columnheader", { name: /AF ratio/ })).not.toBeInTheDocument();
    // The visible label is the group's name and the count; the condition is left to the strip
    // (and to the header's tooltip).
    // A scope row says which participants each side describes; the source row beneath names the sources.
    expect(screen.getByRole("columnheader", { name: "All participants" })).toBeInTheDocument();
    const matchedHeader = screen.getByRole("columnheader", { name: /^Phenotype-matched participants/ });
    expect(matchedHeader).toHaveTextContent(/^Phenotype-matched participants\s*49/);
    expect(screen.getAllByRole("columnheader", { name: "All of Us" }).length).toBeGreaterThan(0);
    // The panel header carries no scope chips; the strip and the scope row say it.
    expect(screen.queryByText("49 with Tetralogy of Fallot")).not.toBeInTheDocument();
  });

  it("keeps the matched columns without a phenotype filter, holding a prompt to add one", () => {
    const onAddPhenotypeFilter = vi.fn();
    renderPanel([IN_AOU_ONLY, NOT_IN_AOU], [], { condition: "", onAddPhenotypeFilter });

    const matchedHeader = screen.getByRole("columnheader", { name: /^Phenotype-matched participants/ });
    // No count to show yet.
    expect(matchedHeader).not.toHaveTextContent(/\d/);
    expect(screen.getByRole("columnheader", { name: /^Hom/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^P\/LP in trans/ })).toBeInTheDocument();

    // One cell across the four matched columns and down every row.
    const prompt = screen.getByTestId("phenotype-prompt-cell");
    expect(prompt).toHaveAttribute("colspan", "4");
    expect(prompt).toHaveAttribute("rowspan", "2");
    expect(within(prompt).getByTestId("phenotype-filter-illustration")).toBeInTheDocument();
    expect(prompt).toHaveTextContent("Compare with a phenotype");

    fireEvent.click(within(prompt).getByRole("button", { name: "Add phenotype filter" }));
    expect(onAddPhenotypeFilter).toHaveBeenCalledOnce();
    // The click stays in the prompt rather than expanding the row it belongs to.
    expect(screen.queryByRole("button", { name: "Collapse row for more detail" })).not.toBeInTheDocument();

    // The matched block moves to the end, past the annotations, and the empty Review column goes.
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent?.trim());
    expect(headers.findIndex((h) => h?.startsWith("P/LP in trans"))).toBeGreaterThan(headers.indexOf("pLOF"));
    expect(headers.indexOf("pLOF")).toBeGreaterThan(headers.indexOf("ClinVar"));
    expect(screen.getByRole("columnheader", { name: /^Phenotype-matched participants/ })).toHaveAttribute("colspan", "4");
    const firstRow = screen.getByText("2-122517541-C-G").closest("tr")!;
    expect(firstRow.lastElementChild).toBe(prompt);

    // A variant not in All of Us spans one message up to the prompt: Gene through pLOF.
    const message = screen.getByText(cellWithText("Not observed in All of Us"));
    expect(message).toHaveAttribute("colspan", "9");
    expect(message.nextElementSibling).toBeNull();
  });

  it("says no one matched when a picked phenotype matched nobody", () => {
    renderPanel([IN_AOU_ONLY], [], { onAddPhenotypeFilter: () => {} });

    const prompt = screen.getByTestId("phenotype-prompt-cell");
    expect(prompt).toHaveTextContent("No matched participants");
    expect(prompt).toHaveTextContent("Tetralogy of Fallot");
    expect(within(prompt).getByRole("button", { name: "Change phenotype" })).toBeInTheDocument();
  });

  it("runs the prompt through an expanded row's detail", () => {
    renderPanel([IN_AOU_ONLY, NOT_IN_AOU], []);

    fireEvent.click(screen.getByText("7-55181378-G-A"));
    expect(screen.getByTestId("phenotype-prompt-cell")).toHaveAttribute("rowspan", "3");
    const detail = screen.getByText("Look up in gnomAD ↗").closest("td")!;
    // Everything before the prompt: four pinned, four source and three annotation columns.
    expect(detail).toHaveAttribute("colspan", "11");
    expect(detail.nextElementSibling).toBeNull();
    // No button without somewhere to send it.
    expect(within(screen.getByTestId("phenotype-prompt-cell")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("spans a variant that isn't in All of Us with one message across every data column", () => {
    renderPanel([NOT_IN_AOU], [NOT_MATCHED]);

    const message = screen.getByText(cellWithText("Not observed in All of Us"));
    // Gene through pLOF: two identity, four source, four matched, three annotation.
    expect(message).toHaveAttribute("colspan", "13");
    expect(message.getAttribute("title")).toMatch(/only includes variants observed in All of Us/);
    // One line of text, but the same row height as the two-line rows around it.
    expect(message).toHaveStyle({ height: "46px" });
    expect(screen.queryByText("Not observed in gnomAD")).not.toBeInTheDocument();
    // The row keeps its expand control.
    const row = message.closest("tr")!;
    expect(within(row).getByRole("button", { name: "Expand row for more detail" })).toBeInTheDocument();
  });

  it("merges only the matched columns when All of Us has the variant but no matched statistics", () => {
    renderPanel([IN_AOU_ONLY], [{ ...NOT_MATCHED, variant: "2-122517541-C-G", gene: "LDLR", consequence: "Missense" }]);

    const messages = screen.getAllByText(cellWithText("Not observed in All of Us"));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toHaveAttribute("colspan", "4");
    expect(screen.getByText("LDLR")).toBeInTheDocument();
    expect(screen.getByText("24 / 2,000")).toBeInTheDocument();
  });

  it("points a variant that isn't in All of Us to gnomAD and ClinVar when expanded", () => {
    renderPanel([NOT_IN_AOU], []);
    fireEvent.click(screen.getByRole("button", { name: "Expand row for more detail" }));

    expect(screen.getByRole("link", { name: "Look up in gnomAD ↗" })).toHaveAttribute(
      "href",
      expect.stringContaining("7-55181378-G-A"),
    );
    expect(screen.getByRole("link", { name: "Look up in ClinVar ↗" })).toHaveAttribute(
      "href",
      "https://www.ncbi.nlm.nih.gov/clinvar/?term=7-55181378-G-A",
    );
  });

  it("opens Review on a row's variant from its control, and offers no control without a handler", () => {
    const onReview = vi.fn();
    renderPanel([IN_AOU_ONLY], [MATCHED], { onReview });
    fireEvent.click(screen.getByRole("button", { name: "Review 2-122517541-C-G" }));
    expect(onReview).toHaveBeenCalledWith("2-122517541-C-G");
    cleanup();

    renderPanel([IN_AOU_ONLY], [MATCHED]);
    expect(screen.queryByRole("button", { name: /^Review/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("pins the expand, Variant, Gene and Consequence columns while the rest scroll", () => {
    renderPanel([IN_AOU_ONLY], [MATCHED]);

    const row = screen.getByText("2-122517541-C-G").closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    cells.slice(0, 4).forEach((cell) => expect(cell).toHaveStyle({ position: "sticky" }));
    expect(cells[4]).not.toHaveStyle({ position: "sticky" });
    expect(screen.getByRole("columnheader", { name: "Variant" })).toHaveStyle({ position: "sticky" });

    // A "not observed" cell that spans past the pinned columns scrolls with the rest.
    cleanup();
    renderPanel([NOT_IN_AOU], []);
    expect(screen.getByText(cellWithText("Not observed in All of Us"))).not.toHaveStyle({ left: "0px" });
  });
});
