import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TopBar from "./TopBar";

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
      condition: "Seizure",
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
      condition: "Seizure",
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
          condition="Seizure"
          onModifySearch={onModifySearch}
          modifyOpen
        />
      </MemoryRouter>,
    );
    expect(searchBox).toHaveAttribute("aria-expanded", "true");
  });

  it("returns focus to the search box when the drawer closes", () => {
    const props = { userEmail: "user@example.org", variantsEnteredCount: 3, condition: "", onModifySearch: vi.fn() };
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
    renderTopBar({ userEmail: "user@example.org", variantsEnteredCount: 3, condition: "", onModifySearch: vi.fn() });

    expect(screen.getByRole("button", { name: "Edit search" })).not.toHaveFocus();
  });

  /**
   * Regression guard. The box's border was once the `border` shorthand with a `borderColor`
   * override for hover and open, and ending either state left it with no colour at all -- so it
   * fell back to the text colour, a near-black outline.
   */
  it("goes back to its grey border after a hover or the drawer closing", () => {
    const props = { userEmail: "user@example.org", variantsEnteredCount: 3, condition: "", onModifySearch: vi.fn() };
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

  it("renders the fallback phenotype label when no condition is set", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 4,
      condition: "",
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
      condition: "Ataxia",
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
      condition: "Ataxia",
      onModifySearch,
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit search" }));

    expect(onModifySearch).toHaveBeenCalledTimes(1);
  });

  it("opens the settings dialog from the gear button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([{ name: "gnomAD", version: "v3.1.2", url: null }]) }),
      ),
    );
    renderTopBar({ userEmail: "user@example.org" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByText("gnomAD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

    it("moves the email into the user icon's tooltip, still readable by screen readers", () => {
      const { container } = renderTopBar({ ...props, variantsEnteredCount: 3, condition: "" });

      expect(container.querySelector('[title="user@example.org"]')).toBeInTheDocument();
      expect(screen.getByText("user@example.org").style.position).toBe("absolute");
    });

    it("shows a variant count without its label, and drops an empty phenotype", () => {
      renderTopBar({ ...props, variantsEnteredCount: 1, condition: "" });
      const searchBox = screen.getByRole("button", { name: "Edit search" });

      expect(screen.getByText("1 variant")).toBeInTheDocument();
      expect(screen.getByText("Variants").style.position).toBe("absolute");
      expect(searchBox).toHaveAccessibleDescription(/Phenotype\s*None entered/);
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    });

    it("keeps a picked phenotype, pluralizing the count", () => {
      renderTopBar({ ...props, variantsEnteredCount: 2, condition: "Tetralogy of Fallot" });

      expect(screen.getByText("2 variants")).toBeInTheDocument();
      expect(screen.getByText("Tetralogy of Fallot")).toHaveAttribute("title", "Tetralogy of Fallot");
    });
  });
});
