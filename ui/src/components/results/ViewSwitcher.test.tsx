import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ViewSwitcher from "./ViewSwitcher";

describe("ViewSwitcher", () => {
  afterEach(cleanup);

  it("marks the showing view pressed and switches on click", () => {
    const onChange = vi.fn();
    render(<ViewSwitcher value="table" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Table" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(onChange).toHaveBeenCalledWith("review");
  });

  it("disables Review with its reason as the button's description and as a tooltip on hover", () => {
    vi.useFakeTimers();
    try {
      render(<ViewSwitcher value="table" onChange={() => {}} reviewUnavailableReason="Add a phenotype filter to review." />);

      const review = screen.getByRole("button", { name: "Review" });
      expect(review).toBeDisabled();
      expect(review).toHaveAccessibleDescription("Add a phenotype filter to review.");

      // The disabled button takes no pointer events, so the hover lands on its wrapper, and the
      // reason appears as the app tooltip after the hover delay.
      fireEvent.mouseEnter(review.parentElement!);
      act(() => vi.advanceTimersByTime(200));
      expect(screen.getByTestId("infoTooltip")).toHaveTextContent("Add a phenotype filter to review.");
    } finally {
      vi.useRealTimers();
    }
  });
});
