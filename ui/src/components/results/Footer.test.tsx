import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Footer from "./Footer";

describe("Footer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the version and Broad logo", () => {
    render(<Footer />);

    expect(screen.getByTitle("VIA version")).toHaveTextContent("v0.0.1");
    expect(screen.getByRole("img", { name: "Broad Institute" })).toHaveAttribute("src", "/broad-logo.svg");
  });
});
