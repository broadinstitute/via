import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getDataViewOptions, resetDataViewOptionsForTests } from "../../utils/dataViewOptions";
import DataViewPanel from "./DataViewPanel";

describe("DataViewPanel", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    resetDataViewOptionsForTests();
  });

  it("offers a Show all rows switch that is off by default and flips the stored option", () => {
    render(<DataViewPanel />);

    const toggle = screen.getByRole("switch", { name: "Show all rows" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAccessibleDescription(/every variant in the tables at once/);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(getDataViewOptions().showAllRows).toBe(true);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(getDataViewOptions().showAllRows).toBe(false);
  });

  it("shows the stored setting when opened", () => {
    window.localStorage.setItem("via.dataViewOptions.v1", JSON.stringify({ showAllRows: true }));
    resetDataViewOptionsForTests();
    render(<DataViewPanel />);

    expect(screen.getByRole("switch", { name: "Show all rows" })).toHaveAttribute("aria-checked", "true");
  });

  it("lists each table's hideable columns, hides one when unticked, and restores them with Show all", () => {
    render(<DataViewPanel />);

    const cohort = screen.getByRole("group", { name: "Candidate variants — all participants columns" });
    const gnomad = within(cohort).getByRole("checkbox", { name: "gnomAD frequencies" });
    expect(gnomad).toBeChecked();
    // The identifying columns aren't on offer.
    expect(within(cohort).queryByRole("checkbox", { name: "Variant" })).not.toBeInTheDocument();

    fireEvent.click(gnomad);
    expect(gnomad).not.toBeChecked();
    expect(getDataViewOptions().hiddenColumns).toEqual(["cohort.gnomad"]);

    fireEvent.click(screen.getByRole("button", { name: /Show all columns in Candidate variants — all participants/ }));
    expect(gnomad).toBeChecked();
    expect(getDataViewOptions().hiddenColumns).toEqual([]);
    expect(screen.queryByRole("button", { name: /Show all columns/ })).not.toBeInTheDocument();
  });
});
