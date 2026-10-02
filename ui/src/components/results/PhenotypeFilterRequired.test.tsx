import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PhenotypeFilterRequired from "./PhenotypeFilterRequired";

describe("PhenotypeFilterRequired", () => {
  afterEach(cleanup);

  it("shows the title, message and add-filter button, and sketches what the panel would hold", () => {
    const onAdd = vi.fn();
    render(
      <PhenotypeFilterRequired
        title="No phenotype filter"
        message="Add a phenotype filter to see participant breakdowns."
        buttonLabel="Add phenotype filter"
        onAddPhenotypeFilter={onAdd}
        illustration="breakdown"
        minHeight={300}
      />,
    );

    expect(screen.getByText("No phenotype filter")).toBeInTheDocument();
    expect(screen.getByText("Add a phenotype filter to see participant breakdowns.")).toBeInTheDocument();
    // Decorative: out of the accessibility tree, so the text alone carries the meaning.
    expect(screen.getByTestId("phenotype-filter-illustration-breakdown")).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByRole("button", { name: "Add phenotype filter" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("sketches a table for the phenotype-matched variants panel", () => {
    render(
      <PhenotypeFilterRequired
        title="No phenotype filter"
        message="Add a phenotype filter to see phenotype-matched participant data."
        buttonLabel="Add phenotype filter"
        onAddPhenotypeFilter={() => {}}
        illustration="table"
        minHeight={413}
      />,
    );
    expect(screen.getByTestId("phenotype-filter-illustration-table")).toBeInTheDocument();
  });
});
