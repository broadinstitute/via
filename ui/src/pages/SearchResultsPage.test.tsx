import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchResultsPage from "./SearchResultsPage";

// The search request waits out a minimum load time of 1s, the same as findBy*'s default timeout,
// so waiting for the outcome needs headroom.
configure({ asyncUtilTimeout: 4000 });

const STATUS = {
  accessible: false,
  tables: [
    { table: "aou-via-dev.foxtrot_synthetic.v3", accessible: false, detail: "Not found: Table" },
    { table: "aou-via-dev.foxtrot_synthetic.cb_criteria", accessible: true, detail: null },
  ],
};

/** Fails /api/search the way Spring does, and answers the status and profile calls normally. */
function stubFailingSearch() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.startsWith("/api/search")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ status: 500, error: "Internal Server Error", path: "/api/search" }),
        });
      }
      if (url === "/api/status") {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STATUS) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ userEmail: "x@example.org" }) });
    }),
  );
}

function searchCalls() {
  return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith("/api/search"));
}

describe("SearchResultsPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("replaces the results with the error page, including BigQuery status, when the search fails", async () => {
    stubFailingSearch();
    render(
      <MemoryRouter initialEntries={["/results?variants=1-100-A-T"]}>
        <Routes>
          <Route path="/results" element={<SearchResultsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Couldn't load search results" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The server responded with status 500 (Internal Server Error)");
    expect(await screen.findByText("1 of 2 tables unavailable")).toBeInTheDocument();
    expect(screen.getByText("Not found: Table")).toBeInTheDocument();
    // The loading panels are gone, but the bar stays for the way home and settings.
    expect(screen.queryByText("Loading variants…")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VIA home, new search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();

    // Try again really re-requests the same search rather than serving the failed attempt from cache.
    expect(searchCalls()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(searchCalls()).toHaveLength(2));
    expect(searchCalls()[1][0]).toBe("/api/search?variants=1-100-A-T");
    expect(await screen.findByRole("heading", { name: "Couldn't load search results" })).toBeInTheDocument();
  });
});
