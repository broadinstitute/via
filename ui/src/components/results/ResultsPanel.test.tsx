import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScopeChip } from "./ResultsPanel";

describe("ScopeChip", () => {
  afterEach(cleanup);

  it("shows its text", () => {
    render(<ScopeChip>All participants</ScopeChip>);

    expect(screen.getByText("All participants")).toBeVisible();
  });

  it("swaps the text for a pulsing placeholder while loading, keeping it for screen readers", () => {
    const { container } = render(
      <ScopeChip tone="accent" loading>
        Loading participant count
      </ScopeChip>,
    );

    expect(container.querySelector(".animate-skeleton-pulse")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Loading participant count").style.position).toBe("absolute");
  });
});
