import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DnaSpinner from "./DnaSpinner";

const preferReducedMotion = (reduce: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );

describe("DnaSpinner", () => {
  afterEach(() => vi.restoreAllMocks());

  it("animates the helix by default", () => {
    preferReducedMotion(false);
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);

    render(<DnaSpinner />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(requestFrame).toHaveBeenCalled();
  });

  it("holds the favicon pose without animating when the user prefers reduced motion", () => {
    preferReducedMotion(true);
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);

    const { container } = render(<DnaSpinner />);

    expect(requestFrame).not.toHaveBeenCalled();
    expect(container.querySelector('[data-part="front"]')?.getAttribute("d")).toBeTruthy();
  });
});
