import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import colors from "../../libs/colors";
import PopulationDonutChart from "./PopulationDonutChart";

const segments = [
  { label: "European", count: 12, percent: 48, color: "#123456" },
  { label: "African/African American", count: 7, percent: 28, color: "#abcdef" },
  { label: "East Asian", count: 6, percent: 24, color: "#fedcba" },
];

describe("PopulationDonutChart", () => {
  it("renders the provided center label", () => {
    render(
      <PopulationDonutChart
        segments={segments}
        centerLabel={
          <>
            <div>25</div>
            <div>participants</div>
          </>
        }
      />,
    );

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("participants")).toBeInTheDocument();
  });

  it("renders one arc per segment plus the reveal mask", () => {
    const { container } = render(<PopulationDonutChart segments={segments} centerLabel="center" />);

    expect(container.querySelectorAll("path")).toHaveLength(segments.length);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });

  /**
   * The spike this replaced: rounded percents can sum past 100, and a dash reaching a closed
   * circle's start got joined around it. Arcs sized from counts meet end to end and close exactly
   * at the top, whatever the percents add up to.
   */
  it("sizes arcs from counts, so they meet end to end and close at the top", () => {
    const skewed = [
      { label: "a", count: 1, percent: 33.4, color: "#111111" },
      { label: "b", count: 1, percent: 33.4, color: "#222222" },
      { label: "c", count: 1, percent: 33.4, color: "#333333" },
    ];
    const { container } = render(<PopulationDonutChart segments={skewed} centerLabel="center" />);
    const endpoints = [...container.querySelectorAll("path")].map((path) => {
      const numbers = (path.getAttribute("d") ?? "").match(/-?[\d.]+(e-?\d+)?/g)!.map(Number);
      return { start: numbers.slice(0, 2), end: numbers.slice(-2) };
    });
    const close = (a: number[], b: number[]) =>
      a.every((value, index) => Math.abs(value - b[index]) < 1e-9);
    const top = [95, 15]; // CENTER, CENTER - RADIUS

    expect(close(endpoints[0].start, top)).toBe(true);
    expect(close(endpoints[0].end, endpoints[1].start)).toBe(true);
    expect(close(endpoints[1].end, endpoints[2].start)).toBe(true);
    expect(close(endpoints[2].end, top)).toBe(true);
  });

  it("draws a segment that is the whole ring as a full circle", () => {
    const { container } = render(
      <PopulationDonutChart
        segments={[{ label: "all", count: 5, percent: 100, color: "#123456" }]}
        centerLabel="center"
      />,
    );

    expect(container.querySelectorAll("path")).toHaveLength(0);
    expect(container.querySelectorAll("circle")[0]).toHaveAttribute("stroke", "#123456");
  });

  it("applies the segment colors and animation classes", () => {
    const { container } = render(<PopulationDonutChart segments={segments} centerLabel="center" />);
    const paths = container.querySelectorAll("path");
    const mask = container.querySelector("circle");

    expect(paths[0]).toHaveAttribute("stroke", "#123456");
    expect(paths[1]).toHaveAttribute("stroke", "#abcdef");
    expect(paths[2]).toHaveAttribute("stroke", "#fedcba");
    expect(mask).toHaveClass("animate-donut-reveal");
    expect(mask).toHaveAttribute("stroke", colors.surface2);
    expect(container.querySelector(".animate-fade-in")).toHaveTextContent("center");
  });
});
