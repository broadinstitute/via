import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSavedSearch, findSavedSearch, loadSavedSearches, recordSavedSearchRun } from "../utils/savedSearches";
import SavedSearchPage from "./SavedSearchPage";
import SavedSearchesPage from "./SavedSearchesPage";

const TETRALOGY = { conceptId: 9000010, name: "Tetralogy of Fallot" };

/** Renders the URL the page navigated to, so the assertions can read it. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/saved" element={<SavedSearchesPage />} />
        <Route path="/saved/:id" element={<SavedSearchPage />} />
        <Route path="/results" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function stubConditions() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ term: "", candidates: [] }) })),
  );
}

describe("SavedSearchPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("opens the saved criteria in the form, with its name, notes and no runs yet", () => {
    stubConditions();
    const saved = createSavedSearch({ name: "LQTS panel", notes: "clinic", variants: ["1-1-A-G", "2-2-C-T"], conditions: [TETRALOGY] });
    renderAt(`/saved/${saved.id}`);

    expect(screen.getByRole("heading", { level: 1, name: "LQTS panel" })).toBeInTheDocument();
    expect(screen.getByText(/^Saved /)).toBeInTheDocument();
    expect(screen.queryByText("Edited")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/8-11708582-C-T/)).toHaveValue("1-1-A-G\n2-2-C-T");
    expect(screen.getByRole("list", { name: "Picked phenotypes" })).toHaveTextContent("Tetralogy of Fallot");
    expect(screen.getByLabelText("Name")).toHaveValue("LQTS panel");
    expect(screen.getByLabelText("Notes")).toHaveValue("clinic");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("complementary", { name: "Runs" })).toHaveTextContent("none yet");
    // The entry page's examples don't belong on a saved search.
    expect(screen.queryByRole("button", { name: "Try an example" })).not.toBeInTheDocument();
  });

  it("runs what's in the form, naming the saved search in the results URL", async () => {
    stubConditions();
    const saved = createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [TETRALOGY] });
    renderAt(`/saved/${saved.id}`);

    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByTestId("location")).toHaveTextContent(
      `/results?variants=1-1-A-G&conditionConceptIds=9000010&saved=${saved.id}`,
    );
  });

  it("marks edits, and keeps them only on Save changes", () => {
    stubConditions();
    const saved = createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [TETRALOGY] }, 1000);
    renderAt(`/saved/${saved.id}`);

    fireEvent.change(screen.getByPlaceholderText(/8-11708582-C-T/), { target: { value: "1-1-A-G\n3-3-G-A" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Renamed " } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "note" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove Tetralogy of Fallot" }));
    expect(screen.getByText("Edited")).toBeInTheDocument();
    expect(findSavedSearch(saved.id)).toMatchObject({ name: "S", variants: ["1-1-A-G"] });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(findSavedSearch(saved.id)).toMatchObject({ name: "Renamed", notes: "note", variants: ["1-1-A-G", "3-3-G-A"], conditions: [] });
    expect(screen.getByRole("heading", { level: 1, name: "Renamed" })).toBeInTheDocument();
    expect(screen.queryByText("Edited")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    // A blank name can't be saved.
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("lists the runs, newest first, with a dash for a run without a phenotype", () => {
    stubConditions();
    const saved = createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [] });
    recordSavedSearchRun(saved.id, null, Date.now() - 3 * 60_000);
    recordSavedSearchRun(saved.id, 191, Date.now() - 60_000);
    renderAt(`/saved/${saved.id}`);

    const runs = within(screen.getByRole("complementary", { name: "Runs" }));
    expect(runs.getByText("2 since saved")).toBeInTheDocument();
    expect(runs.getAllByRole("row").map((row) => row.textContent)).toEqual(["WhenMatched", "1 minute ago191", "3 minutes ago—"]);
    expect(screen.getByText(/last run 1 minute ago/)).toBeInTheDocument();
  });

  it("deletes after confirming, and goes to the list", async () => {
    stubConditions();
    const saved = createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [] });
    renderAt(`/saved/${saved.id}`);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(loadSavedSearches()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this saved search?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(loadSavedSearches()).toEqual([]);
    expect(await screen.findByRole("heading", { level: 1, name: "Saved searches" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument();
  });

  it("says when the saved search is gone", () => {
    stubConditions();
    renderAt("/saved/nope");
    expect(screen.getByText(/no longer exists/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all saved searches" })).toHaveAttribute("href", "/saved");
  });
});

describe("SavedSearchesPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("lists every saved search, most recently changed first, each linking to its page", () => {
    const older = createSavedSearch({ name: "Older", variants: ["1-1-A-G"], conditions: [] }, Date.now() - 2 * 86_400_000);
    const newer = createSavedSearch({ name: "Newer", variants: ["1-1-A-G", "2-2-C-T"], conditions: [TETRALOGY] }, Date.now() - 60_000);
    recordSavedSearchRun(newer.id, 5, Date.now() - 30_000);
    renderAt("/saved");

    const rows = within(screen.getByRole("list", { name: "Saved searches" })).getAllByRole("link");
    expect(rows.map((row) => row.getAttribute("href"))).toEqual([`/saved/${newer.id}`, `/saved/${older.id}`]);
    expect(rows[0]).toHaveTextContent("Newer2 variants · Tetralogy of Fallot · last run just nowsaved 1 minute ago");
    expect(rows[1]).toHaveTextContent("Older1 variant · no phenotypesaved 2 days ago");
  });
});
