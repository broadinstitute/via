import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App", () => {
  beforeEach(() => {
    // These are sanity checks that each route renders, not that the fetched
    // data displays correctly, so fetch is stubbed to never resolve -- every
    // assertion below only depends on the pre-data UI.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the search entry page at /, inside the shell", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1, name: "New search" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^search$/i })).toBeInTheDocument();
  });

  it("renders the search results page at /results", () => {
    renderAt("/results");
    expect(screen.getAllByRole("heading", { name: "Candidate variants" }).length).toBeGreaterThan(0);
  });

  it("renders the rail's destinations", () => {
    renderAt("/recent");
    expect(screen.getByRole("heading", { level: 1, name: "Recent searches" })).toBeInTheDocument();
    renderAt("/saved");
    expect(screen.getByRole("heading", { level: 1, name: "Saved searches" })).toBeInTheDocument();
    renderAt("/sources");
    expect(screen.getByRole("heading", { level: 1, name: "Data sources" })).toBeInTheDocument();
    renderAt("/status");
    expect(screen.getByRole("heading", { level: 1, name: "System status" })).toBeInTheDocument();
    renderAt("/usage");
    expect(screen.getByRole("heading", { level: 1, name: "Usage" })).toBeInTheDocument();
  });
});
