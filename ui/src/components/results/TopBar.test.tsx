import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TopBar from "./TopBar";

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderTopBar(props: Parameters<typeof TopBar>[0]) {
  return render(
    <MemoryRouter>
      <TopBar {...props} />
    </MemoryRouter>,
  );
}

describe("TopBar", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the user email even without search controls", () => {
    renderTopBar({ userEmail: "user@example.org" });

    expect(screen.getByText("user@example.org")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to search" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit search" })).not.toBeInTheDocument();
  });

  it("renders the loaded search summary when modify controls are enabled", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 17,
      condition: "Seizure",
      onModifySearch: vi.fn(),
    });

    expect(screen.getByRole("button", { name: "Back to search" })).toBeInTheDocument();
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

  it("navigates back to the search page from the back button", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 9,
      condition: "Ataxia",
      onModifySearch: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Back to search" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
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
});
