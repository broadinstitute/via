import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConditionSearch } from "../../api/conditions";
import type { BreakdownSegment } from "../../types/results";
import PhenotypeSummaryStrip from "./PhenotypeSummaryStrip";

const CONDITION: ConditionSearch = {
  conceptIds: [9000010],
  concepts: [{ conceptId: 9000010, name: "Tetralogy of Fallot", estimatedParticipantCount: 47, participantCount: 49 }],
  participantCount: 49,
};

/** Two conditions, three participants with both: the total is short of the sum. */
const TWO_CONDITIONS: ConditionSearch = {
  conceptIds: [9000010, 9000040],
  concepts: [
    { conceptId: 9000010, name: "Tetralogy of Fallot", estimatedParticipantCount: 47, participantCount: 49 },
    { conceptId: 9000040, name: "Hypertrophic cardiomyopathy", estimatedParticipantCount: 212, participantCount: 214 },
  ],
  participantCount: 260,
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
    expect(screen.getByRole("button", { name: "Review" })).toHaveAttribute("aria-disabled", "true");
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
    expect(screen.getByRole("img", { name: /^Ancestry breakdown: EUR: .* \(67%\); AFR: .* \(33%\)$/ })).toBeInTheDocument();
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Age breakdown/ })).not.toBeInTheDocument();

    // The toggle is a group of pressed buttons, not tabs: nothing here is a tab panel.
    const breakdownToggle = screen.getByRole("group", { name: "Participant breakdown" });
    expect(within(breakdownToggle).getByRole("button", { name: "Ancestry", pressed: true })).toBeInTheDocument();
    fireEvent.click(within(breakdownToggle).getByRole("button", { name: "Age", pressed: false }));
    expect(within(breakdownToggle).getByRole("button", { name: "Age", pressed: true })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Age breakdown: 40–49: .* \(100%\)$/ })).toBeInTheDocument();
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
    renderStrip({ conditionSearch: { conceptIds: [123], concepts: [], participantCount: null } });
    expect(screen.getByText("Condition concept 123 wasn’t found in this CDR.")).toBeInTheDocument();
    cleanup();

    renderStrip({ conditionSearch: { conceptIds: [123, 456], concepts: [], participantCount: null } });
    expect(screen.getByText("Condition concepts 123, 456 weren’t found in this CDR.")).toBeInTheDocument();
    cleanup();

    renderStrip({ conditionSearch: { ...CONDITION, participantCount: 0 } });
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toHaveAttribute("aria-disabled", "true");
  });

  it("lists several conditions as a table: name, code and each one's own count under a participants label", () => {
    renderStrip({ conditionSearch: TWO_CONDITIONS, ancestryBreakdown: ANCESTRY, ageBreakdown: AGE });

    // The label row says the rule and names the count column.
    expect(screen.getByText("Phenotype")).toHaveTextContent(/any of/);
    expect(screen.getByText("participants")).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: /Conditions, any of/ })).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["Tetralogy of Fallot900001049", "Hypertrophic cardiomyopathy9000040214"]);
    expect(within(rows[0]).getByLabelText("49 participants")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("button", { name: "Copy OMOP concept ID 9000040" })).toBeInTheDocument();
    // The union stays the headline; the per-condition line under it is gone.
    expect(screen.getByText("260")).toBeInTheDocument();
    expect(screen.queryByLabelText("Participants with each condition")).not.toBeInTheDocument();
    // One condition keeps the stacked name-over-code look, without the column label.
    cleanup();
    renderStrip({ conditionSearch: CONDITION, ancestryBreakdown: ANCESTRY, ageBreakdown: AGE });
    expect(screen.getByText("OMOP — 9000010")).toBeInTheDocument();
    expect(screen.queryByText("participants")).not.toBeInTheDocument();
  });

  it("explains in the total's tooltip that the per-condition counts may add up to more than it", () => {
    renderStrip({ conditionSearch: TWO_CONDITIONS, ancestryBreakdown: ANCESTRY, ageBreakdown: AGE });

    expect(screen.getByRole("button", { name: "More information" })).toHaveAccessibleDescription(
      "Participants recorded with any of these conditions, or a more specific form of one. " +
        "A participant with more than one is counted once here, so the counts beside the conditions may add up to more than this total.",
    );
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
