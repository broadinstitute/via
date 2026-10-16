import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPreferences } from "../../utils/preferences";
import SettingsDialog from "./SettingsDialog";

/** Answers /api/status with the given body, /api/sources with SOURCES and /api/usage with USAGE. */
function mockStatus(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url === "/api/sources"
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SOURCES) })
        : url === "/api/usage"
          ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(USAGE) })
          : Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }),
    ),
  );
}

const NOW = new Date();
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const USAGE = {
  queries: 14,
  cacheHits: 5,
  bytesProcessed: 2415919104,
  bytesBilled: 2516582400,
  slotMilliseconds: 48211,
  estimatedCostUsd: 0.0146,
  since: NOW.toISOString(),
  searches: [
    {
      id: 3,
      kind: "condition",
      at: minutesAgo(0.5),
      variants: [],
      phenotype: null,
      term: "long qt",
      queries: [{ name: "Condition candidates", at: minutesAgo(0.5), cacheHit: false, bytesProcessed: 4096, bytesBilled: 10485760, slotMilliseconds: 20 }],
      cacheHits: 0,
      bytesProcessed: 4096,
      bytesBilled: 10485760,
      estimatedCostUsd: 0.00006,
    },
    {
      id: 2,
      kind: "search",
      at: minutesAgo(1),
      variants: ["14-23424218-G-A", "11-47332274-G-A", "1-156134903-A-G"],
      phenotype: "Hypertrophic cardiomyopathy",
      term: null,
      queries: [
        { name: "VAT lookup", at: minutesAgo(1), cacheHit: true, bytesProcessed: 26000, bytesBilled: 0, slotMilliseconds: 0 },
        { name: "Resolve concept", at: minutesAgo(1), cacheHit: true, bytesProcessed: 4000, bytesBilled: 0, slotMilliseconds: 0 },
        { name: "Cohort count", at: minutesAgo(1), cacheHit: true, bytesProcessed: 23000, bytesBilled: 0, slotMilliseconds: 0 },
      ],
      cacheHits: 3,
      bytesProcessed: 53000,
      bytesBilled: 0,
      estimatedCostUsd: 0,
    },
    {
      id: 1,
      kind: "search",
      at: minutesAgo(2),
      variants: ["14-23424218-G-A", "11-47332274-G-A", "1-156134903-A-G"],
      phenotype: null,
      term: null,
      queries: [{ name: "VAT lookup", at: minutesAgo(2), cacheHit: false, bytesProcessed: 26000, bytesBilled: 10485760, slotMilliseconds: 30 }],
      cacheHits: 0,
      bytesProcessed: 26000,
      bytesBilled: 10485760,
      estimatedCostUsd: 0.00006,
    },
  ],
};

function openStatusPanel() {
  fireEvent.click(screen.getByRole("button", { name: "System status" }));
}

const SOURCES = [{ name: "gnomAD", version: "v3.1.2", url: "https://gnomad.broadinstitute.org/" }];

const ACCESSIBLE = {
  accessible: true,
  tables: [
    { table: "proj.vat.v1", accessible: true, detail: null },
    { table: "cdr.C2024.cb_criteria", accessible: true, detail: null },
  ],
};

describe("SettingsDialog", () => {
  beforeEach(() => {
    mockStatus(ACCESSIBLE);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("offers the top bar's usage meter as a checkbox, off by default, and keeps the choice", async () => {
    render(<SettingsDialog onClose={vi.fn()} initialPanel="usage" />);

    const box = await screen.findByRole("checkbox", { name: /Show usage in the top bar/ });
    expect(box).not.toBeChecked();
    expect(readPreferences().showUsageMeter).toBe(false);

    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(readPreferences().showUsageMeter).toBe(true);

    cleanup();
    render(<SettingsDialog onClose={vi.fn()} initialPanel="usage" />);
    expect(await screen.findByRole("checkbox", { name: /Show usage in the top bar/ })).toBeChecked();
  });

  it("opens on the data sources panel", async () => {
    render(<SettingsDialog onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Data sources" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByText("gnomAD")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/sources");
    expect(fetch).not.toHaveBeenCalledWith("/api/status");
  });

  it("switches to the system status panel and lists every checked table", async () => {
    render(<SettingsDialog onClose={vi.fn()} />);
    openStatusPanel();

    expect(screen.getByRole("button", { name: "System status" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByText("All tables accessible")).toBeInTheDocument();
    expect(screen.getByText("proj.vat.v1")).toBeInTheDocument();
    expect(screen.getByText("cdr.C2024.cb_criteria")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/status");
  });

  it("marks each unavailable table with its reason", async () => {
    mockStatus({
      accessible: false,
      tables: [
        { table: "proj.vat.v1", accessible: true, detail: null },
        { table: "cdr.C2024.concept_ancestor", accessible: false, detail: "Access Denied" },
      ],
    });
    render(<SettingsDialog onClose={vi.fn()} />);
    openStatusPanel();

    expect(await screen.findByText("1 of 2 tables unavailable")).toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("reports a failed status request", async () => {
    mockStatus({}, false);
    render(<SettingsDialog onClose={vi.fn()} />);
    openStatusPanel();

    expect(await screen.findByRole("alert")).toHaveTextContent("status 500");
  });

  it("refreshes on demand", async () => {
    render(<SettingsDialog onClose={vi.fn()} />);
    openStatusPanel();
    await screen.findByText("All tables accessible");

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/status")).toHaveLength(2);
    expect(await screen.findByText("All tables accessible")).toBeInTheDocument();
  });

  it("shows this session's BigQuery usage as totals and a log of searches, each opening into its queries", async () => {
    render(<SettingsDialog onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Usage" }));

    const totals = await screen.findByRole("group", { name: "This session's totals" });
    expect(within(totals).getAllByRole("term").map((term) => term.textContent)).toEqual(["Billed", "Est. cost", "Queries", "Slot time"]);
    expect(within(totals).getAllByRole("definition").map((cell) => cell.textContent)).toEqual([
      "2.3 GB",
      "$0.01on-demand",
      "145 from cache",
      "48.2 s",
    ]);
    expect(screen.getByText("Recent requests")).toBeInTheDocument();
    expect(screen.getByText(/^Searches and phenotype lookups since \d{1,2}:\d{2} [AP]M, newest first$/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/usage");

    const rows = within(screen.getByRole("list", { name: /Requests this session/ })).getAllByRole("button");
    expect(rows).toHaveLength(3);
    // Newest first: the phenotype box's lookup, billed like anything else, named by what was typed.
    expect(rows[0]).toHaveTextContent("Condition lookup “long qt”");
    expect(rows[0]).toHaveTextContent(/1 query10 MBbilled$/);
    // Then the search, closed; opening it lists its three cached queries, and the repeat is marked as such.
    expect(rows[1]).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table", { name: "Queries run by request 2" })).not.toBeInTheDocument();
    fireEvent.click(rows[1]);
    expect(rows[1]).toHaveAttribute("aria-expanded", "true");
    expect(rows[1]).toHaveTextContent("14-23424218-G-A, 11-47332274-G-A +1 more");
    expect(rows[1]).toHaveTextContent("Hypertrophic cardiomyopathy");
    expect(rows[1]).toHaveTextContent(/3 queries0 Bcached$/);
    const jobs = screen.getByRole("table", { name: "Queries run by request 2" });
    expect(within(jobs).getAllByRole("row").map((row) => row.textContent)).toEqual([
      "WhenQueryReadBilled",
      expect.stringMatching(/VAT lookup25 KB0cache$/),
      expect.stringMatching(/Resolve concept4 KB0cache$/),
      expect.stringMatching(/Cohort count22 KB0cache$/),
    ]);
    // The oldest is closed and billed; opening it lists its one billed query.
    expect(rows[2]).toHaveAttribute("aria-expanded", "false");
    expect(rows[2]).toHaveTextContent(/1 query10 MBbilled$/);
    expect(screen.queryByRole("table", { name: "Queries run by request 1" })).not.toBeInTheDocument();
    fireEvent.click(rows[2]);
    expect(within(screen.getByRole("table", { name: "Queries run by request 1" })).getAllByRole("row")[1]).toHaveTextContent(/VAT lookup25 KB10 MBbilled$/);
    fireEvent.click(rows[1]);
    expect(screen.queryByRole("table", { name: "Queries run by request 2" })).not.toBeInTheDocument();
  });

  it("pages through the searches ten at a time, newest first", async () => {
    const searches = Array.from({ length: 13 }, (_, index) => ({
      ...USAGE.searches[2],
      id: 13 - index,
      variants: [`${13 - index}-1-A-G`],
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url === "/api/usage"
          ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...USAGE, searches }) })
          : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SOURCES) }),
      ),
    );
    render(<SettingsDialog onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Usage" }));
    await screen.findByText("1–10 of 13");

    const list = () => within(screen.getByRole("list", { name: /Requests this session/ })).getAllByRole("button");
    expect(list()).toHaveLength(10);
    expect(list()[0]).toHaveTextContent("13-1-A-G");
    expect(list()[9]).toHaveTextContent("4-1-A-G");
    expect(screen.getByRole("button", { name: "Newer requests" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Older requests" }));
    expect(screen.getByText("11–13 of 13")).toBeInTheDocument();
    expect(list()).toHaveLength(3);
    expect(list()[0]).toHaveTextContent("3-1-A-G");
    expect(screen.getByRole("button", { name: "Older requests" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Newer requests" }));
    expect(screen.getByText("1–10 of 13")).toBeInTheDocument();
  });

  it("has no pager for ten searches or fewer", async () => {
    render(<SettingsDialog onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Usage" }));
    await screen.findByText("Recent requests");

    expect(screen.queryByRole("navigation", { name: "Requests, by page" })).not.toBeInTheDocument();
  });

  it("says when no search has run yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url === "/api/usage"
          ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...USAGE, queries: 0, searches: [] }) })
          : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SOURCES) }),
      ),
    );
    render(<SettingsDialog onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Usage" }));

    expect(await screen.findByText("Nothing has queried BigQuery yet this session.")).toBeInTheDocument();
  });

  it("closes from the close button, Escape, and the backdrop", async () => {
    const onClose = vi.fn();
    render(<SettingsDialog onClose={onClose} />);
    await screen.findByText("gnomAD");

    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    fireEvent.click(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
