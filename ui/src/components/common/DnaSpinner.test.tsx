import { cleanup, render, screen } from "@testing-library/react";
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
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

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

  it("runs every spinner off one shared animation loop, turning in step", () => {
    preferReducedMotion(false);
    const callbacks: FrameRequestCallback[] = [];
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.spyOn(performance, "now").mockReturnValue(1000);

    const { container } = render(
      <>
        <DnaSpinner />
        <DnaSpinner />
        <DnaSpinner />
      </>,
    );
    const frontPaths = () => [...container.querySelectorAll('[data-part="front"]')].map((path) => path.getAttribute("d"));
    const rest = frontPaths()[0];
    expect(requestFrame).toHaveBeenCalledTimes(1);

    // A quarter of the default 2s turn later.
    callbacks[0](1500);

    expect(requestFrame).toHaveBeenCalledTimes(2);
    const paths = frontPaths();
    expect(paths[0]).not.toBe(rest);
    // Two front paths per spinner: every spinner's pair matches the first's.
    expect(paths).toEqual([paths[0], paths[1], paths[0], paths[1], paths[0], paths[1]]);
  });

  it("stops the shared loop once the last spinner unmounts", () => {
    preferReducedMotion(false);
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");

    const first = render(<DnaSpinner />);
    const second = render(<DnaSpinner />);
    first.unmount();
    expect(cancelFrame).not.toHaveBeenCalled();

    second.unmount();
    expect(cancelFrame).toHaveBeenCalledWith(7);
  });
});
