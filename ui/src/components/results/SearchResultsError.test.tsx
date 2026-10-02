import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchResultsError from "./SearchResultsError";

const STATUS = {
  accessible: false,
  tables: [
    { table: "aou-via-dev.foxtrot_synthetic.v3", accessible: true, detail: null },
    {
      table: "aou-via-dev.foxtrot_synthetic.cb_criteria",
      accessible: false,
      detail: "Access Denied: Table aou-via-dev:foxtrot_synthetic.cb_criteria",
    },
  ],
};

/** Answers /api/status with the given outcome. */
function stubStatus(response: { ok: boolean; body?: unknown } | "reject") {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      response === "reject"
        ? Promise.reject(new TypeError("Failed to fetch"))
        : Promise.resolve({
            ok: response.ok,
            status: response.ok ? 200 : 500,
            json: () => Promise.resolve(response.body),
          }),
    ),
  );
}

function renderError(onRetry = vi.fn()) {
  render(
    <MemoryRouter>
      <SearchResultsError message="The server responded with status 500 (Internal Server Error)" onRetry={onRetry} />
    </MemoryRouter>,
  );
  return onRetry;
}

describe("SearchResultsError", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the failure and offers a retry and a way back to a new search", () => {
    stubStatus({ ok: true, body: STATUS });
    const onRetry = renderError();

    expect(screen.getByRole("heading", { name: "Couldn't load search results" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The server responded with status 500 (Internal Server Error)");
    expect(screen.getByRole("link", { name: "New search" })).toHaveAttribute("href", "/");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("lists each BigQuery table's status, with the reason an unavailable one failed", async () => {
    stubStatus({ ok: true, body: STATUS });
    renderError();

    expect(fetch).toHaveBeenCalledWith("/api/status");
    expect(await screen.findByText("1 of 2 tables unavailable")).toBeInTheDocument();
    expect(screen.getByText("aou-via-dev.foxtrot_synthetic.v3")).toBeInTheDocument();
    expect(screen.getByText("Accessible")).toBeInTheDocument();
    expect(screen.getByText("aou-via-dev.foxtrot_synthetic.cb_criteria")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Access Denied: Table aou-via-dev:foxtrot_synthetic.cb_criteria")).toBeInTheDocument();
  });

  it("re-runs the table check from its Refresh button", async () => {
    stubStatus({ ok: true, body: STATUS });
    renderError();
    await screen.findByText("1 of 2 tables unavailable");

    fireEvent.click(await screen.findByRole("button", { name: "Refresh" }));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("1 of 2 tables unavailable")).toBeInTheDocument();
  });

  it("says so when the status check itself can't reach the backend", async () => {
    stubStatus("reject");
    renderError();

    expect(await screen.findByText("Couldn't reach the backend: Failed to fetch")).toBeInTheDocument();
  });
});
