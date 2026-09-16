import { describe, expect, it } from "vitest";
import { phenotypeUnavailableCopy } from "./phenotype";

describe("phenotypeUnavailableCopy", () => {
  it("returns the add-filter copy when no phenotype term is provided", () => {
    expect(phenotypeUnavailableCopy("", "participant breakdowns")).toEqual({
      message: "No phenotype specified — add a phenotype filter to see participant breakdowns.",
      buttonLabel: "Add phenotype filter",
    });
  });

  it("interpolates the requested subject in the no-phenotype message", () => {
    expect(phenotypeUnavailableCopy("", "phenotype-matched participant data")).toEqual({
      message: "No phenotype specified — add a phenotype filter to see phenotype-matched participant data.",
      buttonLabel: "Add phenotype filter",
    });
  });

  it("returns the modify-filter copy when a phenotype term exists", () => {
    expect(phenotypeUnavailableCopy("Seizure", "participant breakdowns")).toEqual({
      message: "No phenotype data available yet for Seizure.",
      buttonLabel: "Modify phenotype filter",
    });
  });
});
