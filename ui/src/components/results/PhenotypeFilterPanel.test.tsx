import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConditionSearch } from "../../api/conditions";
import type { BreakdownSegment } from "../../types/results";
import PhenotypeFilterPanel from "./PhenotypeFilterPanel";

const CONDITION: ConditionSearch = {
  conceptId: 9000010,
  concept: { conceptId: 9000010, name: "Tetralogy of Fallot", estimatedParticipantCount: 47 },
  participantCount: 49,
};

const ANCESTRY: BreakdownSegment[] = [
  { label: "EUR", count: 20, percent: 66.7, color: "#F9C854" },
  { label: "AFR", count: 10, percent: 33.3, color: "#2078B4" },
];

const AGE: BreakdownSegment[] = [{ label: "40–49", count: 30, percent: 100, color: "#5FAEDA" }];

function renderPanel(props: Partial<React.ComponentProps<typeof PhenotypeFilterPanel>> = {}) {
  render(
    <PhenotypeFilterPanel
      conditionSearch={null}
      ancestryBreakdown={[]}
      ageBreakdown={[]}
      onAddPhenotypeFilter={vi.fn()}
      {...props}
    />,
  );
}

describe("PhenotypeFilterPanel", () => {
  afterEach(cleanup);

  it("prompts for a phenotype when no condition was picked", () => {
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

  it("shows the mock breakdown, totalled from its own segments, beside the real count", () => {
    renderPanel({ conditionSearch: CONDITION, ancestryBreakdown: ANCESTRY, ageBreakdown: AGE });

    expect(screen.getByText("Participant breakdown")).toBeInTheDocument();
    // 49 is the real condition count; 30 is what the mock segments add up to.
    expect(screen.getByText("49")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("leaves the breakdown out when there isn't one", () => {
    renderPanel({ conditionSearch: CONDITION });

    expect(screen.queryByText("Participant breakdown")).not.toBeInTheDocument();
  });
});
