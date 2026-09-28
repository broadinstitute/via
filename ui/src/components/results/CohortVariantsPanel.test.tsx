import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AnnotatedCohortVariant, CohortVariantRow } from "../../types/results";
import CohortVariantsPanel from "./CohortVariantsPanel";

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
  afterEach(cleanup);

  it("spans a variant that isn't in All of Us with one message, not a claim about gnomAD", () => {
    render(<CohortVariantsPanel rows={[NOT_IN_AOU]} />);

    const message = screen.getByText("Not observed in All of Us").closest("td")!;
    // Gene through pLOF: three annotation, six source and three more annotation columns.
    expect(message).toHaveAttribute("colspan", "12");
    expect(message.getAttribute("title")).toMatch(/only includes variants observed in All of Us/);
    expect(screen.queryByText("Not observed in gnomAD")).not.toBeInTheDocument();
  });

  it("still says not observed in gnomAD for a variant All of Us has but gnomAD doesn't", () => {
    render(<CohortVariantsPanel rows={[IN_AOU_ONLY]} />);

    expect(screen.getByText("Not observed in gnomAD")).toBeInTheDocument();
    expect(screen.queryByText("Not observed in All of Us")).not.toBeInTheDocument();
    expect(screen.getByText("BRCA1")).toBeInTheDocument();
  });
});
