import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import colors, { alpha } from "../../libs/colors";
import ClinvarBadge from "./ClinvarBadge";

describe("ClinvarBadge", () => {
  it("shows the short code in split mode and the full classification in tag mode", () => {
    const { unmount } = render(<ClinvarBadge significance="Pathogenic" />);
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.queryByText("Pathogenic")).not.toBeInTheDocument();
    unmount();

    render(<ClinvarBadge significance="Likely pathogenic" mode="tag" />);
    expect(screen.getByText("Likely pathogenic")).toBeInTheDocument();
    expect(screen.queryByText("LP")).not.toBeInTheDocument();
  });

  it("appends the review stars when given, and leaves them out when null", () => {
    const { container, unmount } = render(<ClinvarBadge significance="VUS" stars={3} />);
    expect(screen.getByText("3★")).toBeInTheDocument();
    expect(screen.getByText("3★")).toHaveStyle({ color: colors.textSecondary });
    expect(container.firstChild).toHaveAttribute("title", "ClinVar: VUS, 3 of 4 review stars");
    unmount();

    const { container: plain } = render(<ClinvarBadge significance="Benign" stars={null} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    expect(plain.textContent).toBe("B");
    expect(plain.firstChild).toHaveAttribute("title", "ClinVar: Benign");
  });

  it("is a tinted pill in the classification's colour, one width for every split badge", () => {
    const { container } = render(<ClinvarBadge significance="VUS" stars={2} />);
    expect(container.firstChild).toHaveStyle({
      background: colors.bgWarning,
      color: colors.textWarning,
      border: `1px solid ${alpha(colors.textWarning, 0.35)}`,
      borderRadius: "999px",
      width: "82px",
    });
    // The code sits in a fixed slot, so the divider and stars land at the same x in every row.
    expect(screen.getByText("VUS")).toHaveStyle({ width: "24px" });

    const { container: tag } = render(<ClinvarBadge significance="VUS" mode="tag" />);
    expect(tag.firstChild).not.toHaveStyle({ width: "82px" });
  });

  it("marks a definitive call with a filled dot and a likely call with a hollow one", () => {
    const { container, unmount } = render(<ClinvarBadge significance="Benign" />);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveStyle({ background: colors.textSuccess });
    unmount();

    const { container: likely } = render(<ClinvarBadge significance="Likely benign" />);
    expect(likely.querySelector('[aria-hidden="true"]')).toHaveStyle({
      border: `1.5px solid ${colors.textSuccess}`,
      background: "transparent",
    });
  });
});
