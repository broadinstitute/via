import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPreferences, updatePreferences } from "../../utils/preferences";
import { recordRecentSearch } from "../../utils/recentSearches";
import { createSavedSearch } from "../../utils/savedSearches";
import Rail, { describeVariants, initials, RAIL_LIST_LIMIT } from "./Rail";

const USAGE = { queries: 3, cacheHits: 1, bytesProcessed: 678_000, bytesBilled: 83_886_080, slotMilliseconds: 0, estimatedCostUsd: 0.0005, since: new Date().toISOString(), searches: [] };

function stubUsage() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(USAGE) })),
  );
}

function renderRail(props: Partial<Parameters<typeof Rail>[0]> = {}, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Rail userEmail="m.bemis@example.org" collapsed={false} canUnfold={false} {...props} />
    </MemoryRouter>,
  );
}

const TETRALOGY = { conceptId: 9000010, name: "Tetralogy of Fallot" };

describe("Rail", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("has the brand, New search, the workspace destinations and the user", () => {
    stubUsage();
    renderRail();
    const rail = screen.getByRole("navigation", { name: "Workspace" });
    expect(within(rail).getByRole("link", { name: "VIA home, new search" })).toHaveAttribute("href", "/");
    expect(within(rail).getByRole("link", { name: "New search" })).toHaveAttribute("href", "/");
    expect(within(rail).getByRole("link", { name: "Data sources" })).toHaveAttribute("href", "/sources");
    expect(within(rail).getByRole("link", { name: "System status" })).toHaveAttribute("href", "/status");
    expect(within(rail).getByRole("link", { name: "Usage" })).toHaveAttribute("href", "/usage");
    expect(within(rail).getByText("m.bemis@example.org")).toBeInTheDocument();
    expect(within(rail).getByText("MB")).toBeInTheDocument();
    // Empty sections say what fills them rather than vanishing.
    expect(within(rail).getByText("Save a search to keep it here.")).toBeInTheDocument();
    expect(within(rail).getByText("Searches you run show here.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lists saved and recent searches, a few each, with links to the rest", () => {
    stubUsage();
    for (let i = 0; i < RAIL_LIST_LIMIT + 2; i++) {
      recordRecentSearch({ variants: [`${i}-1-A-G`, "2-2-C-T"], conditions: i === 0 ? [TETRALOGY] : [] }, 1000 * (i + 1));
    }
    createSavedSearch({ name: "LQTS panel", variants: ["1-1-A-G"], conditions: [TETRALOGY] });
    renderRail();

    const rail = screen.getByRole("navigation", { name: "Workspace" });
    const saved = within(rail).getByRole("link", { name: /LQTS panel/ });
    expect(saved).toHaveAttribute("href", expect.stringMatching(/^\/saved\/.+/));
    expect(saved).toHaveTextContent("1 variant · Tetralogy of Fallot");
    expect(within(rail).queryByRole("link", { name: /^All 1$/ })).toBeInTheDocument();

    const recent = within(rail).getAllByRole("link", { name: /^Run again:/ });
    expect(recent).toHaveLength(RAIL_LIST_LIMIT);
    // Newest first: the last recorded, without a phenotype.
    expect(recent[0]).toHaveAccessibleName(/^Run again: 2 variants, no phenotype, /);
    expect(recent[0]).toHaveAttribute("href", `/results?variants=${RAIL_LIST_LIMIT + 1}-1-A-G&variants=2-2-C-T`);
    expect(within(rail).getByRole("link", { name: `All ${RAIL_LIST_LIMIT + 2}` })).toHaveAttribute("href", "/recent");
  });

  it("marks the recent search whose results are showing", () => {
    stubUsage();
    recordRecentSearch({ variants: ["1-1-A-G"], conditions: [TETRALOGY] });
    recordRecentSearch({ variants: ["2-2-C-T"], conditions: [] }, Date.now() + 1);
    renderRail({}, "/results?variants=1-1-A-G&conditionConceptIds=9000010");

    const showing = screen.getByRole("link", { name: /Tetralogy of Fallot, showing now$/ });
    expect(showing).toHaveAttribute("aria-current", "page");
    expect(showing).toHaveTextContent("now");
    expect(screen.getByRole("link", { name: /^Run again: 1 variant, no phenotype/ })).not.toHaveAttribute("aria-current");
  });

  it("shows the usage figure on the Usage row once opted in, reading it from the backend", async () => {
    stubUsage();
    updatePreferences({ showUsageMeter: true });
    renderRail();

    const usage = await screen.findByRole("link", { name: "Usage < $0.01 this session" });
    expect(usage).toHaveAttribute("href", "/usage");
    expect(screen.getByTitle("BigQuery this session: 662 KB scanned · 80 MB billed · < $0.01 estimated")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/usage");
  });

  it("folds from its chevron, remembering the choice", () => {
    stubUsage();
    renderRail();
    fireEvent.click(screen.getByRole("button", { name: "Fold the rail" }));
    expect(readPreferences().railCollapsed).toBe(true);
  });

  describe("folded", () => {
    it("keeps every destination as an icon with its name, and unfolds when the fold was the user's", () => {
      stubUsage();
      updatePreferences({ railCollapsed: true, showUsageMeter: true });
      createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [] });
      renderRail({ collapsed: true, canUnfold: true });

      const rail = screen.getByRole("navigation", { name: "Workspace" });
      expect(within(rail).getByRole("link", { name: "New search" })).toHaveAttribute("href", "/");
      expect(within(rail).getByRole("link", { name: "Saved searches, 1" })).toHaveAttribute("href", "/saved");
      expect(within(rail).getByRole("link", { name: "Recent searches, 0" })).toHaveAttribute("href", "/recent");
      expect(within(rail).getByRole("link", { name: "Data sources" })).toHaveAttribute("href", "/sources");
      expect(within(rail).getByRole("link", { name: "System status" })).toHaveAttribute("href", "/status");
      expect(within(rail).getByRole("img", { name: "m.bemis@example.org" })).toHaveTextContent("MB");
      expect(within(rail).queryByText("m.bemis@example.org")).not.toBeInTheDocument();

      fireEvent.click(within(rail).getByRole("button", { name: "Unfold the rail" }));
      expect(readPreferences().railCollapsed).toBe(false);
    });

    it("offers no unfold when the window folded it", () => {
      stubUsage();
      renderRail({ collapsed: true, canUnfold: false });
      expect(screen.queryByRole("button", { name: "Unfold the rail" })).not.toBeInTheDocument();
    });

    it("marks Recent when a recent search's results are showing", () => {
      stubUsage();
      recordRecentSearch({ variants: ["1-1-A-G"], conditions: [] });
      renderRail({ collapsed: true }, "/results?variants=1-1-A-G");
      expect(screen.getByRole("link", { name: "Recent searches, 1" })).toHaveAttribute("aria-current", "page");
    });
  });
});

describe("initials", () => {
  it("takes the first letters of the local part's words, or its first two letters", () => {
    expect(initials("m.bemis@example.org")).toBe("MB");
    expect(initials("jane_doe@example.org")).toBe("JD");
    expect(initials("alice@example.org")).toBe("AL");
    expect(initials("")).toBe("");
  });
});

describe("describeVariants", () => {
  it("names the first variant and how many more", () => {
    expect(describeVariants([])).toBe("No variants");
    expect(describeVariants(["1-1-A-G"])).toBe("1-1-A-G");
    expect(describeVariants(["1-1-A-G", "2-2-C-T", "3-3-G-A"])).toBe("1-1-A-G +2");
  });
});
