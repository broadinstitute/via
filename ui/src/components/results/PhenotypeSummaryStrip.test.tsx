import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConditionSearch } from "../../api/conditions";
import type { BreakdownSegment } from "../../types/results";
import PhenotypeSummaryStrip from "./PhenotypeSummaryStrip";

const CONDITION: ConditionSearch = {
  conceptId: 9000010,
  concept: { conceptId: 9000010, name: "Tetralogy of Fallot", estimatedParticipantCount: 47 },
  participantCount: 49,
};

const ANCESTRY: BreakdownSegment[] = [
  { label: "EUR", count: 33, percent: 67.3, color: "#F9C854" },
  { label: "AFR", count: 16, percent: 32.7, color: "#2078B4" },
];
const AGE: BreakdownSegment[] = [{ label: "40–49", count: 49, percent: 100, color: "#5FAEDA" }];

function renderStrip(props: Partial<React.ComponentProps<typeof PhenotypeSummaryStrip>> = {}) {
  const onViewChange = vi.fn();
  const onAddPhenotypeFilter = vi.fn();
  render(
    <PhenotypeSummaryStrip
      conditionSearch={null}
      ancestryBreakdown={[]}
      ageBreakdown={[]}
      onAddPhenotypeFilter={onAddPhenotypeFilter}
      view="table"
      onViewChange={onViewChange}
      canReview={(props.ancestryBreakdown?.length ?? 0) > 0}
      {...props}
    />,
  );
  return { onViewChange, onAddPhenotypeFilter };
}

describe("PhenotypeSummaryStrip", () => {
  afterEach(cleanup);

  it("prompts for a phenotype when none was picked, and keeps Review out of reach", () => {
    const { onAddPhenotypeFilter } = renderStrip();

    expect(screen.getByText("No phenotype filter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add phenotype filter/i }));
    expect(onAddPhenotypeFilter).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Table", pressed: true })).toBeInTheDocument();
  });

  it("shows the condition, the participant count and the breakdown in one row", () => {
    renderStrip({ conditionSearch: CONDITION, ancestryBreakdown: ANCESTRY, ageBreakdown: AGE });

    expect(screen.getByText("Tetralogy of Fallot")).toBeInTheDocument();
    expect(screen.getByText("OMOP — 9000010")).toBeInTheDocument();
    expect(screen.getByText("49")).toBeInTheDocument();
    expect(screen.getByText("matched")).toBeInTheDocument();
    // Every block carries the same small label.
    expect(["Phenotype", "Participants", "Breakdown", "View"].map((label) => screen.getByText(label))).toHaveLength(4);
    expect(screen.getByRole("img", { name: "Ancestry breakdown: EUR 67%, AFR 33%" })).toBeInTheDocument();
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Age breakdown/ })).not.toBeInTheDocument();

    // The toggle is a group of pressed buttons, not tabs: nothing here is a tab panel.
    const breakdownToggle = screen.getByRole("group", { name: "Participant breakdown" });
    expect(within(breakdownToggle).getByRole("button", { name: "Ancestry", pressed: true })).toBeInTheDocument();
    fireEvent.click(within(breakdownToggle).getByRole("button", { name: "Age", pressed: false }));
    expect(within(breakdownToggle).getByRole("button", { name: "Age", pressed: true })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Age breakdown: 40–49 100%" })).toBeInTheDocument();
    expect(screen.getByText("40–49")).toBeInTheDocument();
  });

  it("switches views from its segmented control", () => {
    const { onViewChange } = renderStrip({ conditionSearch: CONDITION, ancestryBreakdown: ANCESTRY, ageBreakdown: AGE });

    const review = within(screen.getByRole("group", { name: "Results view" })).getByRole("button", { name: "Review" });
    expect(review).toBeEnabled();
    fireEvent.click(review);
    expect(onViewChange).toHaveBeenCalledWith("review");
  });

  it("reports a picked concept the CDR doesn't have, and a condition that matched nobody", () => {
    renderStrip({ conditionSearch: { conceptId: 123, concept: null, participantCount: null } });
    expect(screen.getByText("Condition concept 123 wasn’t found in this CDR.")).toBeInTheDocument();
    cleanup();

    renderStrip({ conditionSearch: { ...CONDITION, participantCount: 0 } });
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("shows a skeleton while results load", () => {
    const { container } = render(
      <PhenotypeSummaryStrip
        loading
        conditionSearch={undefined}
        ancestryBreakdown={[]}
        ageBreakdown={[]}
        onAddPhenotypeFilter={vi.fn()}
        view="table"
        onViewChange={vi.fn()}
        canReview={false}
      />,
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Results view" })).not.toBeInTheDocument();
  });
});
