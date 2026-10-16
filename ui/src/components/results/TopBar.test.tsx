import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updatePreferences } from "../../utils/preferences";
import TopBar, { USAGE_REFRESH_MS } from "./TopBar";

/** The meter is opt-in; these tests turn it on. */
const showMeter = () => updatePreferences({ showUsageMeter: true });

/** What /api/usage answers: 2.25 GiB scanned ("2.3 GB"), 2.5 GiB billed ("2.5 GB"). */
const USAGE = {
  queries: 14,
  cacheHits: 5,
  bytesProcessed: 2415919104,
  bytesBilled: 2684354560,
  slotMilliseconds: 48211,
  estimatedCostUsd: 0.0146,
  since: new Date().toISOString(),
  searches: [],
};

function renderTopBar(props: Parameters<typeof TopBar>[0]) {
  return render(
    <MemoryRouter>
      <TopBar {...props} />
    </MemoryRouter>,
  );
}

describe("TopBar", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders the user email even without search controls", () => {
    renderTopBar({ userEmail: "user@example.org" });

    expect(screen.getByText("user@example.org")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VIA home, new search" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "Edit search" })).not.toBeInTheDocument();
  });

  it("renders the loaded search summary when modify controls are enabled", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 17,
      phenotypes: ["Seizure"],
      onModifySearch: vi.fn(),
    });

    expect(screen.getByRole("link", { name: "VIA home, new search" })).toBeInTheDocument();
    expect(screen.getByText("17 entered")).toBeInTheDocument();
    expect(screen.getByText("Seizure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit search" })).toBeEnabled();
  });

  it("opens the drawer from anywhere in the search box, which describes the current terms", () => {
    const onModifySearch = vi.fn();
    const { rerender } = renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 17,
      phenotypes: ["Seizure"],
      onModifySearch,
    });
    const searchBox = screen.getByRole("button", { name: "Edit search" });

    expect(searchBox).toHaveAccessibleDescription(/Variants\s*17 entered.*Phenotype\s*Seizure/);
    expect(searchBox).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByText("Seizure"));
    expect(onModifySearch).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <TopBar
          userEmail="user@example.org"
          variantsEnteredCount={17}
          phenotypes={["Seizure"]}
          onModifySearch={onModifySearch}
          modifyOpen
        />
      </MemoryRouter>,
    );
    expect(searchBox).toHaveAttribute("aria-expanded", "true");
  });

  it("returns focus to the search box when the drawer closes", () => {
    const props = { userEmail: "user@example.org", variantsEnteredCount: 3, phenotypes: [], onModifySearch: vi.fn() };
    const { rerender } = renderTopBar({ ...props, modifyOpen: true });
    const searchBox = screen.getByRole("button", { name: "Edit search" });
    expect(searchBox).not.toHaveFocus();

    rerender(
      <MemoryRouter>
        <TopBar {...props} modifyOpen={false} />
      </MemoryRouter>,
    );

    expect(searchBox).toHaveFocus();
  });

  it("doesn't take focus on first render with the drawer closed", () => {
    renderTopBar({ userEmail: "user@example.org", variantsEnteredCount: 3, phenotypes: [], onModifySearch: vi.fn() });

    expect(screen.getByRole("button", { name: "Edit search" })).not.toHaveFocus();
  });

  /**
   * Regression guard. The box's border was once the `border` shorthand with a `borderColor`
   * override for hover and open, and ending either state left it with no colour at all -- so it
   * fell back to the text colour, a near-black outline.
   */
  it("goes back to its grey border after a hover or the drawer closing", () => {
    const props = { userEmail: "user@example.org", variantsEnteredCount: 3, phenotypes: [], onModifySearch: vi.fn() };
    const { rerender } = renderTopBar({ ...props, modifyOpen: true });
    const searchBox = screen.getByRole("button", { name: "Edit search" });
    const grey = "rgb(199, 198, 192)";

    rerender(
      <MemoryRouter>
        <TopBar {...props} modifyOpen={false} />
      </MemoryRouter>,
    );
    expect(searchBox.style.borderColor).toBe(grey);

    fireEvent.mouseEnter(searchBox);
    expect(searchBox.style.borderColor).not.toBe(grey);
    fireEvent.mouseLeave(searchBox);
    expect(searchBox.style.borderColor).toBe(grey);
  });

  /**
   * Regression guard. The edit-search popover's backdrop is fixed to the window and starts at
   * the bar's height. When the bar scrolled with the page, that left an undimmed strip at the
   * top of the window, over the results, once the page was scrolled.
   */
  it("stays pinned to the top of the window", () => {
    const { container } = renderTopBar({ userEmail: "user@example.org" });

    expect(container.firstChild).toHaveStyle({ position: "sticky", top: "0px" });
  });

  it("names two conditions as alternatives, and a long list by its first and how many more", () => {
    renderTopBar({ userEmail: "user@example.org", variantsEnteredCount: 2, phenotypes: ["Seizure", "Ataxia"], onModifySearch: vi.fn() });
    expect(screen.getByText("Seizure or Ataxia")).toHaveAttribute("title", "Seizure or Ataxia");
    cleanup();

    const long = ["Hypertrophic cardiomyopathy", "Long QT syndrome", "Familial hypercholesterolemia"];
    renderTopBar({ userEmail: "user@example.org", variantsEnteredCount: 2, phenotypes: long, onModifySearch: vi.fn() });
    expect(screen.getByText("Hypertrophic cardiomyopathy +2 more")).toHaveAttribute(
      "title",
      "Hypertrophic cardiomyopathy, Long QT syndrome or Familial hypercholesterolemia",
    );
  });

  it("renders the fallback phenotype label when no condition is set", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 4,
      phenotypes: [],
      onModifySearch: vi.fn(),
    });

    expect(screen.getByText("None entered")).toBeInTheDocument();
  });

  it("renders loading skeletons and disables modify while loading", () => {
    renderTopBar({
      userEmail: "user@example.org",
      loading: true,
      onModifySearch: vi.fn(),
    });

    expect(screen.queryByText(/entered$/)).not.toBeInTheDocument();
    expect(screen.queryByText("None entered")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-skeleton-pulse")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Edit search" })).toBeDisabled();
  });

  it("links home from the VIA mark, in place of the old back arrow", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 9,
      phenotypes: ["Ataxia"],
      onModifySearch: vi.fn(),
    });

    const brand = screen.getByRole("link", { name: "VIA home, new search" });
    expect(brand).toHaveAttribute("href", "/");
    expect(brand).toHaveTextContent("VIA");
    expect(screen.queryByRole("button", { name: "Back to search" })).not.toBeInTheDocument();
  });

  it("calls onModifySearch when the search box is pressed", () => {
    const onModifySearch = vi.fn();
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 9,
      phenotypes: ["Ataxia"],
      onModifySearch,
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit search" }));

    expect(onModifySearch).toHaveBeenCalledTimes(1);
  });

  /** Answers the settings panels' requests and the bar's own usage read. */
  function stubBackend(usage: unknown = USAGE) {
    const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url === "/api/usage"
          ? json(usage)
          : url === "/api/status"
            ? json({ accessible: true, tables: [] })
            : json([{ name: "gnomAD", version: "v3.1.2", url: null }]),
      ),
    );
  }

  it("opens the settings dialog from the gear button", async () => {
    stubBackend();
    renderTopBar({ userEmail: "user@example.org" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByText("gnomAD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("keeps the meter off the bar by default, without reading usage", async () => {
    stubBackend();
    renderTopBar({ userEmail: "user@example.org" });

    expect(screen.queryByRole("button", { name: /BigQuery usage/ })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith("/api/usage");

    // Switched on from the Usage panel, it appears without a reload.
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Usage" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /Show usage in the top bar/ }));
    expect(await screen.findByRole("button", { name: /BigQuery usage this session: 2.3 GB scanned/ })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows the session's bytes scanned and opens the Usage panel from the meter", async () => {
    showMeter();
    stubBackend();
    renderTopBar({ userEmail: "user@example.org" });

    const meter = await screen.findByRole("button", {
      name: "BigQuery usage this session: 2.3 GB scanned, 2.5 GB billed, $0.01 estimated. Open usage details",
    });
    expect(meter).toHaveTextContent("2.3 GB·2.5 GB·$0.01");
    expect(meter).toHaveAttribute("title", "BigQuery this session: 2.3 GB scanned · 2.5 GB billed · $0.01 estimated");

    fireEvent.click(meter);
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(within(dialog).getByRole("button", { name: "Usage" })).toHaveAttribute("aria-current", "page");
    expect(await within(dialog).findByRole("heading", { name: "BigQuery usage" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("leaves the meter off the bar when usage can't be read", async () => {
    showMeter();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 503, statusText: "Service Unavailable", text: () => Promise.resolve("") })),
    );
    renderTopBar({ userEmail: "user@example.org" });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/usage"));
    expect(screen.queryByRole("button", { name: /BigQuery usage/ })).not.toBeInTheDocument();
    expect(screen.getByText("user@example.org")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("re-reads usage every minute while shown, and stops when switched off", async () => {
    showMeter();
    let bytes = USAGE.bytesProcessed;
    const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => (url === "/api/usage" ? json({ ...USAGE, bytesProcessed: bytes }) : json([]))),
    );
    // Only the interval is faked, so fetch's promises and findBy's polling still run for real.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      renderTopBar({ userEmail: "user@example.org" });
      expect(await screen.findByText("2.3 GB")).toBeInTheDocument();
      expect(fetch).toHaveBeenCalledTimes(1);

      // Another 2.25 GiB scanned since the first read; the meter catches up on its next tick.
      bytes *= 2;
      act(() => vi.advanceTimersByTime(USAGE_REFRESH_MS - 1));
      expect(fetch).toHaveBeenCalledTimes(1);
      act(() => vi.advanceTimersByTime(1));
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(await screen.findByText("4.5 GB")).toBeInTheDocument();

      // Off again: the meter goes, and so do the reads.
      act(() => updatePreferences({ showUsageMeter: false }));
      expect(screen.queryByRole("button", { name: /BigQuery usage/ })).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(USAGE_REFRESH_MS * 3));
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
    vi.unstubAllGlobals();
  });

  it("re-reads usage once a search has loaded", async () => {
    showMeter();
    stubBackend();
    const { rerender } = renderTopBar({ userEmail: "user@example.org", loading: true, onModifySearch: vi.fn() });

    expect(fetch).not.toHaveBeenCalledWith("/api/usage");
    rerender(
      <MemoryRouter>
        <TopBar userEmail="user@example.org" loading={false} variantsEnteredCount={1} onModifySearch={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("2.3 GB")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  describe("at narrow width", () => {
    const matchMedia = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = ((query: string) => ({ ...matchMedia(query), matches: true })) as typeof window.matchMedia;
    });
    afterEach(() => {
      window.matchMedia = matchMedia;
    });

    const props = { userEmail: "user@example.org", onModifySearch: vi.fn() };

    it("shows only the estimated cost in the usage meter, with the rest in its tooltip", async () => {
      showMeter();
      stubBackend();
      renderTopBar(props);

      const meter = await screen.findByRole("button", { name: /BigQuery usage this session/ });
      expect(meter).toHaveTextContent("$0.01");
      expect(meter).not.toHaveTextContent("GB");
      expect(meter).toHaveAttribute("title", expect.stringContaining("2.3 GB scanned"));
      vi.unstubAllGlobals();
    });

    it("moves the email into the user icon's tooltip, still readable by screen readers", () => {
      const { container } = renderTopBar({ ...props, variantsEnteredCount: 3, phenotypes: [] });

      expect(container.querySelector('[title="user@example.org"]')).toBeInTheDocument();
      expect(screen.getByText("user@example.org").style.position).toBe("absolute");
    });

    it("shows a variant count without its label, and drops an empty phenotype", () => {
      renderTopBar({ ...props, variantsEnteredCount: 1, phenotypes: [] });
      const searchBox = screen.getByRole("button", { name: "Edit search" });

      expect(screen.getByText("1 variant")).toBeInTheDocument();
      expect(screen.getByText("Variants").style.position).toBe("absolute");
      expect(searchBox).toHaveAccessibleDescription(/Phenotype\s*None entered/);
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    });

    it("keeps a picked phenotype, pluralizing the count", () => {
      renderTopBar({ ...props, variantsEnteredCount: 2, phenotypes: ["Tetralogy of Fallot"] });

      expect(screen.getByText("2 variants")).toBeInTheDocument();
      expect(screen.getByText("Tetralogy of Fallot")).toHaveAttribute("title", "Tetralogy of Fallot");
    });
  });
});
