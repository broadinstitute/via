import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { recordRecentSearch } from "../utils/recentSearches";
import RecentSearchesPage from "./RecentSearchesPage";

/** Renders the URL the page navigated to, so the assertions can read it. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/recent"]}>
      <Routes>
        <Route path="/recent" element={<RecentSearchesPage />} />
        <Route path="/results" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RecentSearchesPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("says there's nothing yet, without a Clear action", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Recent searches" })).toBeInTheDocument();
    expect(screen.getByText(/No searches yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("re-runs a search with a click", async () => {
    recordRecentSearch({ variants: ["1-1-A-G", "2-2-C-T"], conditions: [{ conceptId: 9000010, name: "Tetralogy of Fallot" }] });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^Run again: 2 variants, Tetralogy of Fallot/ }));
    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/results?variants=1-1-A-G&variants=2-2-C-T&conditionConceptIds=9000010",
    );
  });

  it("re-runs a search with several conditions, naming them as alternatives", async () => {
    recordRecentSearch({
      variants: ["1-1-A-G"],
      conditions: [
        { conceptId: 9000010, name: "Tetralogy of Fallot" },
        { conceptId: 9000040, name: "Hypertrophic cardiomyopathy" },
      ],
    });
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: /^Run again: 1 variant, Tetralogy of Fallot or Hypertrophic cardiomyopathy/ }),
    );
    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/results?variants=1-1-A-G&conditionConceptIds=9000010&conditionConceptIds=9000040",
    );
  });

  it("folds searches older than a week under Earlier until asked", () => {
    const day = 24 * 60 * 60 * 1000;
    recordRecentSearch({ variants: ["9-9-A-G"], conditions: [] }, Date.now() - 9 * day);
    recordRecentSearch({ variants: ["1-1-A-G"], conditions: [{ conceptId: 9000010, name: "Tetralogy of Fallot" }] });
    renderPage();

    expect(screen.getByRole("region", { name: "Today" })).toHaveTextContent("Tetralogy of Fallot");
    const earlier = screen.getByRole("button", { name: /^Earlier/ });
    expect(earlier).toHaveAttribute("aria-expanded", "false");
    expect(earlier).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: /^Run again: 1 variant, no phenotype/ })).not.toBeInTheDocument();

    fireEvent.click(earlier);
    expect(earlier).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^Run again: 1 variant, no phenotype/ })).toBeInTheDocument();
  });

  it("clears the history, and the page follows", () => {
    recordRecentSearch({ variants: ["1-1-A-G"], conditions: [] });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByText(/No searches yet/)).toBeInTheDocument();
    expect(window.localStorage.getItem("via.recentSearches.v2")).toBeNull();
  });
});
