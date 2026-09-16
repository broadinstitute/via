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

    expect(container.querySelectorAll("circle")).toHaveLength(segments.length + 1);
  });

  it("renders segment arcs with the expected dash geometry", () => {
    const { container } = render(<PopulationDonutChart segments={segments} centerLabel="center" />);
    const circles = container.querySelectorAll("circle");

    expect(circles[0]).toHaveAttribute("stroke-dasharray", "48 52");
    expect(circles[0]).toHaveAttribute("stroke-dashoffset", "0");
    expect(circles[1]).toHaveAttribute("stroke-dasharray", "28 72");
    expect(circles[1]).toHaveAttribute("stroke-dashoffset", "-48");
    expect(circles[2]).toHaveAttribute("stroke-dasharray", "24 76");
    expect(circles[2]).toHaveAttribute("stroke-dashoffset", "-76");
  });

  it("applies the segment colors and animation classes", () => {
    const { container } = render(<PopulationDonutChart segments={segments} centerLabel="center" />);
    const circles = container.querySelectorAll("circle");

    expect(circles[0]).toHaveAttribute("stroke", "#123456");
    expect(circles[1]).toHaveAttribute("stroke", "#abcdef");
    expect(circles[2]).toHaveAttribute("stroke", "#fedcba");
    expect(circles[3]).toHaveClass("animate-donut-reveal");
    expect(circles[3]).toHaveAttribute("stroke", colors.surface2);
    expect(container.querySelector(".animate-fade-in")).toHaveTextContent("center");
  });
});
