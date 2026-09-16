import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import colors from "../../libs/colors";
import SectionLoadingPanel from "./SectionLoadingPanel";

describe("SectionLoadingPanel", () => {
  it("renders the section title and default loading message", () => {
    render(<SectionLoadingPanel title="Phenotype filter" />);

    expect(screen.getByRole("heading", { name: "Phenotype filter" })).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders a custom loading message", () => {
    render(<SectionLoadingPanel title="Candidate variants" message="Loading variants…" />);

    expect(screen.getByText("Loading variants…")).toBeInTheDocument();
  });

  it("applies the requested content minHeight", () => {
    const { container } = render(<SectionLoadingPanel title="Candidate variants" minHeight={425} />);
    const content = container.querySelector("h2")?.parentElement?.nextElementSibling as HTMLElement;

    expect(content).toHaveStyle({
      minHeight: "425px",
    });
  });

  it("renders the DNA spinner with the placeholder-specific label and colors", () => {
    const { container } = render(<SectionLoadingPanel title="Candidate variants" />);
    const spinner = container.querySelector('svg[role="status"][aria-label="Loading"]') as SVGElement;

    expect(spinner).toHaveAttribute("width", "72");
    expect(spinner).toHaveStyle({
      "--dna-duration": "2000ms",
    });

    const circles = spinner.querySelectorAll("circle");
    expect(circles[0]).toHaveAttribute("fill", colors.textSecondary);
    expect(circles[1]).toHaveAttribute("fill", colors.textAccent);
    expect(spinner.querySelectorAll("line")).toHaveLength(0);
  });
});
