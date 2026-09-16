import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BreakdownLegend from "./BreakdownLegend";

const segments = [
  { label: "European", count: 12, percent: 48, color: "#123456" },
  { label: "African/African American", count: 7, percent: 28, color: "#abcdef" },
  { label: "East Asian", count: 6, percent: 24, color: "#fedcba" },
];

describe("BreakdownLegend", () => {
  it("renders every segment label, count, and percent", () => {
    render(<BreakdownLegend segments={segments} />);

    expect(screen.getByText("European")).toBeInTheDocument();
    expect(screen.getByText("African/African American")).toBeInTheDocument();
    expect(screen.getByText("East Asian")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("48%")).toBeInTheDocument();
    expect(screen.getByText("28%")).toBeInTheDocument();
    expect(screen.getByText("24%")).toBeInTheDocument();
  });

  it("renders one animated row per segment", () => {
    const { container } = render(<BreakdownLegend segments={segments} />);

    expect(container.querySelectorAll(".animate-row-fade-in")).toHaveLength(segments.length);
  });

  it("applies staggered animation delays to legend rows", () => {
    const { container } = render(<BreakdownLegend segments={segments} />);
    const rows = container.querySelectorAll(".animate-row-fade-in");

    expect(rows[0]).toHaveStyle({ animationDelay: "0.5s" });
    expect(rows[1]).toHaveStyle({ animationDelay: "0.54s" });
    expect(rows[2]).toHaveStyle({ animationDelay: "0.58s" });
  });

  it("renders each segment color dot with the segment color", () => {
    const { container } = render(<BreakdownLegend segments={segments} />);
    const rows = container.querySelectorAll(".animate-row-fade-in");

    rows.forEach((row, index) => {
      const dot = row.firstChild as HTMLElement;
      expect(dot).toHaveStyle({ background: segments[index].color });
    });
  });
});
