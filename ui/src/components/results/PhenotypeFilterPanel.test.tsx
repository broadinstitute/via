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

// Sum to CONDITION's participantCount, as the backend's scaled mock breakdowns do.
const ANCESTRY: BreakdownSegment[] = [
  { label: "EUR", count: 33, percent: 67.3, color: "#F9C854" },
  { label: "AFR", count: 16, percent: 32.7, color: "#2078B4" },
];

const AGE: BreakdownSegment[] = [{ label: "40–49", count: 49, percent: 100, color: "#5FAEDA" }];

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

  it("shows the picked concept, with its count left to the breakdown", () => {
    renderPanel({ conditionSearch: CONDITION });

    expect(screen.getByText("OMOP — 9000010")).toBeInTheDocument();
    expect(screen.getByText("Tetralogy of Fallot")).toBeInTheDocument();
    expect(screen.queryByText("49")).not.toBeInTheDocument();
    expect(screen.queryByText("participants matched")).not.toBeInTheDocument();
  });

  /** No donut appears for nobody, so the card's note is what has to say so. */
  it("says when the picked condition matched nobody", () => {
    renderPanel({ conditionSearch: { ...CONDITION, participantCount: 0 } });

    expect(screen.getByText(/No participants are recorded with this condition/)).toBeInTheDocument();
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

  it("centers the breakdown donut on the real participant count", () => {
    renderPanel({ conditionSearch: CONDITION, ancestryBreakdown: ANCESTRY, ageBreakdown: AGE });

    expect(screen.getByText("Participant breakdown")).toBeInTheDocument();
    // Only in the donut's center now; the condition card no longer repeats it.
    expect(screen.getAllByText("49")).toHaveLength(1);
  });

  it("leaves the breakdown out when there isn't one", () => {
    renderPanel({ conditionSearch: CONDITION });

    expect(screen.queryByText("Participant breakdown")).not.toBeInTheDocument();
  });
});
