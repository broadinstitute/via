import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConditionSearch } from "../../api/conditions";
import type { PhenotypeCrosswalk } from "../../types/results";
import PhenotypeFilterPanel from "./PhenotypeFilterPanel";

const CONDITION: ConditionSearch = {
  conceptId: 9000010,
  concept: { conceptId: 9000010, name: "Tetralogy of Fallot", estimatedParticipantCount: 47 },
  participantCount: 49,
};

const CROSSWALK: PhenotypeCrosswalk = {
  hpoCode: "HP:0001636",
  omopCode: "313867",
  description: "Tetralogy of Fallot",
  participantCount: 120,
};

function renderPanel(props: Partial<React.ComponentProps<typeof PhenotypeFilterPanel>> = {}) {
  render(
    <PhenotypeFilterPanel
      conditionSearch={null}
      crosswalk={null}
      ancestryBreakdown={[]}
      ageBreakdown={[]}
      hpoTerm=""
      onAddPhenotypeFilter={vi.fn()}
      {...props}
    />,
  );
}

describe("PhenotypeFilterPanel", () => {
  afterEach(cleanup);

  it("prompts for a phenotype when there is neither a condition nor a crosswalk", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: /add phenotype filter/i })).toBeInTheDocument();
  });

  it("shows the real participant count for a searched condition", () => {
    renderPanel({ conditionSearch: CONDITION });

    expect(screen.getByText("49")).toBeInTheDocument();
    expect(screen.getByText("participants matched")).toBeInTheDocument();
    expect(screen.getByText("OMOP — 9000010")).toBeInTheDocument();
    expect(screen.getByText("Tetralogy of Fallot")).toBeInTheDocument();
  });

  /** The count includes descendants, so it exceeds the concept's own records. Say so. */
  it("explains that the count includes more specific forms", () => {
    renderPanel({ conditionSearch: CONDITION });

    expect(
      screen.getByText(/any more specific form of it/i),
    ).toBeInTheDocument();
  });

  it("reports a picked concept the CDR doesn't have", () => {
    renderPanel({ conditionSearch: { conceptId: 123, concept: null, participantCount: null } });

    expect(screen.getByText("Condition concept 123 wasn’t found in this CDR.")).toBeInTheDocument();
  });

  /**
   * A condition alone must not send the panel to its empty state, which is the regression
   * introduced by replacing the entry page's HPO input: hpoTerm is empty on that path, so
   * crosswalk comes back null.
   */
  it("does not fall back to the empty state when only a condition is present", () => {
    renderPanel({ conditionSearch: CONDITION });

    expect(screen.queryByRole("button", { name: /add phenotype filter/i })).not.toBeInTheDocument();
  });

  it("still renders the HPO crosswalk when one is present", () => {
    renderPanel({ crosswalk: CROSSWALK });

    expect(screen.getByText("HPO — HP:0001636")).toBeInTheDocument();
    expect(screen.getByText("OMOP — 313867")).toBeInTheDocument();
  });

  it("renders both when a condition and an HPO term were given", () => {
    renderPanel({ conditionSearch: CONDITION, crosswalk: CROSSWALK });

    expect(screen.getByText("OMOP — 9000010")).toBeInTheDocument();
    expect(screen.getByText("HPO — HP:0001636")).toBeInTheDocument();
    expect(screen.getByText("49")).toBeInTheDocument();
  });

  /** Guards the crash: the donut reads crosswalk.participantCount unconditionally. */
  it("renders without a crosswalk", () => {
    expect(() => renderPanel({ conditionSearch: CONDITION })).not.toThrow();
  });
});
