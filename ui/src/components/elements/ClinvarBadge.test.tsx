import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import colors from "../../libs/colors";
import ClinvarBadge from "./ClinvarBadge";

describe("ClinvarBadge", () => {
  it("renders the short ClinVar label in split mode", () => {
    render(<ClinvarBadge significance="Pathogenic" />);

    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.queryByText("Pathogenic")).not.toBeInTheDocument();
  });

  it("renders the star rating in split mode when stars are provided", () => {
    render(<ClinvarBadge significance="VUS" stars={3} />);

    expect(screen.getByText("3★")).toBeInTheDocument();
  });

  it("omits the star rating in split mode when stars are null", () => {
    const { container } = render(<ClinvarBadge significance="Benign" stars={null} />);

    expect(screen.queryByText("★")).not.toBeInTheDocument();
    expect(container.textContent).toBe("B");
  });

  it("renders the full significance label in tag mode", () => {
    render(<ClinvarBadge significance="Likely pathogenic" mode="tag" />);

    expect(screen.getByText("Likely pathogenic")).toBeInTheDocument();
    expect(screen.queryByText("LP")).not.toBeInTheDocument();
  });

  it("uses a solid border for definitive tag badges", () => {
    render(<ClinvarBadge significance="Benign" mode="tag" />);

    expect(screen.getByText("Benign")).toHaveStyle({
      border: `1px solid ${colors.textSuccess}`,
      padding: "1px 6px",
    });
  });

  it("uses a dashed border for likely tag badges", () => {
    render(<ClinvarBadge significance="Likely benign" mode="tag" />);

    expect(screen.getByText("Likely benign")).toHaveStyle({
      border: `1px dashed ${colors.textSuccess}`,
      padding: "2px 7px",
    });
  });

  it("uses the configured warning colors for VUS split badges", () => {
    const { container } = render(<ClinvarBadge significance="VUS" stars={2} />);
    const badge = container.firstChild as HTMLElement;
    const [label, stars] = badge.children;

    expect(label).toHaveTextContent("VUS");
    expect(label).toHaveStyle({
      background: colors.bgWarning,
      color: colors.textWarning,
    });
    expect(stars).toHaveTextContent("2★");
    expect(stars).toHaveStyle({
      borderLeft: `1px solid ${colors.textWarning}`,
      color: colors.textSecondary,
    });
  });

  it("uses a dashed outer border for likely split badges", () => {
    const { container } = render(<ClinvarBadge significance="Likely pathogenic" stars={1} />);

    expect(container.firstChild).toHaveStyle({
      border: `1px dashed ${colors.textDanger}`,
    });
  });
});
