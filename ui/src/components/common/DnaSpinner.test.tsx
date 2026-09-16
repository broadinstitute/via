import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DnaSpinner from "./DnaSpinner";

describe("DnaSpinner", () => {
  it("includes a reduced-motion rule that fully stops spinner animation", () => {
    render(<DnaSpinner />);

    const css = screen.getByRole("status", { name: "Loading" }).querySelector("style")?.textContent ?? "";

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".dna-node,");
    expect(css).toContain(".dna-rung { animation-play-state: paused; }");
    expect(css).not.toContain(".dna-group { animation:");
    expect(css).not.toContain("@keyframes dna-breathe");
  });
});
