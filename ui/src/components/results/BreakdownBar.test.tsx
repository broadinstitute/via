import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BreakdownBar from "./BreakdownBar";

const SEGMENTS = [
  { label: "EUR", count: 33, percent: 67.3, color: "#F9C854" },
  { label: "AFR", count: 16, percent: 32.7, color: "#2078B4" },
  { label: "MID", count: 0, percent: 0, color: "#CB2D4C" },
];

describe("BreakdownBar", () => {
  afterEach(cleanup);

  it("draws each group as a run of the bar in proportion to its count, with a legend beneath", () => {
    render(<BreakdownBar segments={SEGMENTS} label="Ancestry" />);

    const bar = screen.getByRole("img", { name: "Ancestry breakdown: EUR 67%, AFR 33%, MID 0%" });
    const runs = Array.from(bar.children) as HTMLElement[];
    expect(runs).toHaveLength(3);
    expect(runs[0]).toHaveStyle({ flex: "33 0 3px", background: "#F9C854" });
    expect(runs[1]).toHaveStyle({ flex: "16 0 3px" });
    // A group nobody is in keeps a sliver, so the legend entry has something to point at.
    expect(runs[2]).toHaveStyle({ flex: "0 0 3px" });
    expect(runs[0]).toHaveAttribute("title", "EUR: 33 participants (67%)");

    expect(screen.getByLabelText("Ancestry breakdown")).toHaveTextContent("EUR67%AFR33%MID0%");
  });
});
