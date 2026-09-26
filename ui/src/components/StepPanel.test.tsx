import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import StepPanel from "./StepPanel";

describe("StepPanel", () => {
  afterEach(cleanup);

  it("renders its step number, title and body", () => {
    render(
      <StepPanel stepNumber={2} title="Phenotype">
        <p>body</p>
      </StepPanel>,
    );

    expect(screen.getByRole("heading", { name: "Phenotype" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("renders an optional tag", () => {
    render(
      <StepPanel stepNumber={2} title="Phenotype" tags={[{ label: "Optional", variant: "optional" }]}>
        <p>body</p>
      </StepPanel>,
    );

    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("renders several tags in order, with any hover text", () => {
    render(
      <StepPanel
        stepNumber={1}
        title="Candidate variants"
        tags={[
          { label: "3 entered", variant: "count", title: "Variants entered" },
          { label: "limit 50", variant: "limit" },
        ]}
      >
        <p>body</p>
      </StepPanel>,
    );

    const header = screen.getByRole("heading", { name: "Candidate variants" }).parentElement!;
    expect(header).toHaveTextContent(/3 entered.*limit 50/);
    expect(screen.getByText("3 entered")).toHaveAttribute("title", "Variants entered");
  });

  /**
   * Regression guard. StepPanel spreads Style.elements.panel, which clips to its rounded
   * corners with overflow: hidden -- and that also clips anything a child positions outside
   * the panel. It cut off ConditionSearchField's dropdown at the panel edge, with no way to
   * reach the hidden options, because the clipping ancestor isn't itself scrollable.
   *
   * If this goes back to "hidden", the condition dropdown silently breaks again.
   */
  it("does not clip children that overflow the panel", () => {
    const { container } = render(
      <StepPanel stepNumber={2} title="Phenotype">
        <p>body</p>
      </StepPanel>,
    );

    expect(container.firstChild).toHaveStyle({ overflow: "visible" });
  });

  it("drops the raised shadow when flat", () => {
    const { container } = render(
      <StepPanel stepNumber={2} title="Phenotype" flat>
        <p>body</p>
      </StepPanel>,
    );

    expect(container.firstChild).toHaveStyle({ boxShadow: "none" });
  });

  /** The header rounds its own top corners, which is what overflow: hidden used to do. */
  it("rounds the header's top corners itself", () => {
    render(
      <StepPanel stepNumber={2} title="Phenotype">
        <p>body</p>
      </StepPanel>,
    );

    const header = screen.getByRole("heading", { name: "Phenotype" }).parentElement;
    expect(header).toHaveStyle({
      borderTopLeftRadius: "11px",
      borderTopRightRadius: "11px",
    });
  });
});
