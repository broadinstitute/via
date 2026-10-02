import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FilteredVariantRow } from "../../types/results";
import { resetDataViewOptionsForTests, setDataViewOptions } from "../../utils/dataViewOptions";
import ParticipantMatchedVariantsPanel, { MATCHED_TABLE_HEIGHT } from "./ParticipantMatchedVariantsPanel";

/** A cell by its full text, which can span elements (the italic program name). */
const cellWithText = (text: string) => (_: string, element: Element | null) =>
  element?.tagName === "TD" && element.textContent === text;

const OBSERVED: FilteredVariantRow = {
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

function renderPanel(rows: FilteredVariantRow[]) {
  render(
    <ParticipantMatchedVariantsPanel
      rows={rows}
      participantCount={49}
      hasPhenotypeFilter
      condition="Tetralogy of Fallot"
      onAddPhenotypeFilter={vi.fn()}
    />,
  );
}

describe("ParticipantMatchedVariantsPanel", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    resetDataViewOptionsForTests();
  });

  it("leaves hidden columns out and spans the not-observed message over the remaining stat columns", () => {
    setDataViewOptions({ hiddenColumns: ["matched.afRatio", "matched.homozygotes"] });
    renderPanel([OBSERVED, { variant: "7-55181378-G-A", gene: null, consequence: null, hasStats: false }]);

    expect(screen.queryByRole("columnheader", { name: "Homozygotes" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Heterozygotes" })).toBeInTheDocument();
    // Nine spanned columns, less the two hidden stats.
    expect(screen.getByText(cellWithText("Not observed in All of Us"))).toHaveAttribute("colspan", "7");
  });

  it("caps the table's height by default, and lets it grow with the Show all rows option", () => {
    renderPanel([OBSERVED]);
    const scroller = () => screen.getByRole("table").parentElement!;
    expect(scroller()).toHaveStyle({ height: `${MATCHED_TABLE_HEIGHT}px` });

    act(() => setDataViewOptions({ showAllRows: true }));
    expect(scroller()).not.toHaveStyle({ height: `${MATCHED_TABLE_HEIGHT}px` });
  });

  it("replaces an unobserved variant's empty cells with one message, keeping its ID and controls", () => {
    renderPanel([OBSERVED, { variant: "7-55181378-G-A", gene: null, consequence: null, hasStats: false }]);

    const message = screen.getByText(cellWithText("Not observed in All of Us"));
    // Gene, Consequence and the seven stat columns.
    expect(message).toHaveAttribute("colspan", "9");
    const row = message.closest("tr")!;
    expect(row).toHaveTextContent("7-55181378-G-A");
    expect(row.querySelector('input[type="checkbox"]')).toBeInTheDocument();
    expect(row.querySelectorAll("td")).toHaveLength(4);
  });

  it("still shows a known gene and consequence, merging only the stat columns", () => {
    renderPanel([{ variant: "3-4285715-T-A", gene: "MYH7", consequence: "Nonsense", hasStats: false }]);

    expect(screen.getByText(cellWithText("Not observed in All of Us"))).toHaveAttribute("colspan", "7");
    expect(screen.getByText("MYH7")).toBeInTheDocument();
    expect(screen.getByText("Nonsense")).toBeInTheDocument();
  });
});
