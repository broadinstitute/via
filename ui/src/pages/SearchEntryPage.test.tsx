import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchEntryPage from "./SearchEntryPage";

const TETRALOGY = { conceptId: 9000010, name: "Tetralogy of Fallot", estimatedParticipantCount: 47 };

// The condition field debounces its lookup by 1s, the same as findBy*'s default timeout, so
// waiting for its options needs headroom. See ConditionSearchField.test.tsx.
configure({ asyncUtilTimeout: 2500 });

/**
 * Covers the wiring the component tests can't: that Step 2 really is the condition combobox,
 * and that a picked condition reaches the results URL.
 */

/** Renders the URL the page navigated to, so the assertions can read it. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<SearchEntryPage />} />
        <Route path="/results" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Routes /api/profile and /api/condition, which the page hits for different reasons. */
function stubApi(candidates: unknown[], term: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.startsWith("/api/condition")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ term, candidates }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ userEmail: "x@example.org" }) });
    }),
  );
}

describe("SearchEntryPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("offers a condition combobox for the phenotype step", () => {
    stubApi([], "");
    renderPage();

    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "e.g. tetralogy of fallot");
    expect(screen.queryByPlaceholderText("e.g. HP:0001636")).not.toBeInTheDocument();
  });

  it("ends with the footer", () => {
    stubApi([], "");
    renderPage();

    expect(screen.getByRole("contentinfo")).toContainElement(screen.getByRole("img", { name: "Broad Institute" }));
  });

  it("counts the variants entered, ignoring blank lines, and flags going over the limit", () => {
    stubApi([], "");
    renderPage();
    const textarea = screen.getByPlaceholderText(/8-11708582-C-T/);

    expect(screen.getByText("0 entered")).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "8-11708582-C-T\n\n  8-11708590-G-GAA  \n" } });
    expect(screen.getByText("2 entered")).toHaveAttribute("title", "Variants entered, one per line.");

    const tooMany = Array.from({ length: 51 }, (_, index) => `1-${index + 1}-A-G`).join("\n");
    fireEvent.change(textarea, { target: { value: tooMany } });
    expect(screen.getByText("51 entered")).toHaveAttribute("title", "Search is limited to 50 variants.");
  });

  it("disables search above the limit, and says how many to remove", () => {
    stubApi([], "");
    renderPage();
    const textarea = screen.getByPlaceholderText(/8-11708582-C-T/);
    const variantLines = (count: number) =>
      Array.from({ length: count }, (_, index) => `1-${index + 1}-A-G`).join("\n");

    fireEvent.change(textarea, { target: { value: variantLines(50) } });
    expect(screen.getByRole("button", { name: /search/i })).toBeEnabled();

    fireEvent.change(textarea, { target: { value: variantLines(53) } });
    expect(screen.getByRole("button", { name: /search/i })).toBeDisabled();
    expect(screen.getByText(/53 variants entered\. Remove 3 to search \(limit 50\)\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.queryByTestId("location")).not.toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: variantLines(50) } });
    expect(screen.getByRole("button", { name: /search/i })).toBeEnabled();
    expect(screen.queryByText(/Remove \d+ to search/)).not.toBeInTheDocument();
  });

  it("disables search until a variant is entered", () => {
    stubApi([], "");
    renderPage();
    const textarea = screen.getByPlaceholderText(/8-11708582-C-T/);

    expect(screen.getByRole("button", { name: /search/i })).toBeDisabled();

    // Blank lines alone don't count as a variant.
    fireEvent.change(textarea, { target: { value: "\n  \n" } });
    expect(screen.getByRole("button", { name: /search/i })).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "8-11708582-C-T" } });
    expect(screen.getByRole("button", { name: /search/i })).toBeEnabled();
  });

  /**
   * The backend counts exactly the concept that was picked, which is what makes a low- or
   * zero-estimate concept countable. Its name isn't sent: there's no free-text path to use it.
   */
  it("carries the picked concept's id into the results URL", async () => {
    stubApi([TETRALOGY], "tetralogy");
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/8-11708582-C-T/), {
      target: { value: "8-11708582-C-T" },
    });
    const combobox = screen.getByRole("combobox");
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: "tetralogy" } });
    // Scoped to the option role on purpose: RecentSearches also renders the text "Tetralogy of
    // Fallot" (it's the description for HP:0001636), so a plain findByText picks up that
    // instead and the click silently does nothing.
    fireEvent.mouseDown(await screen.findByRole("option", { name: /Tetralogy of Fallot/ }));
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/results?variants=8-11708582-C-T&conditionConceptId=9000010",
      ),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("condition=");
  });

  /**
   * Editing after picking invalidates the selection -- the text no longer necessarily names
   * that concept, so sending its id would count something the user isn't looking at.
   */
  it("drops the concept id when the text is edited after picking", async () => {
    stubApi([TETRALOGY], "tetralogy");
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/8-11708582-C-T/), {
      target: { value: "8-11708582-C-T" },
    });
    const combobox = screen.getByRole("combobox");
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: "tetralogy" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: /Tetralogy of Fallot/ }));
    fireEvent.change(combobox, { target: { value: "something else" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/results?variants=8-11708582-C-T"),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("condition");
  });

  /** The condition is optional, so a variants-only search must still go through. */
  it("searches without a condition", async () => {
    stubApi([], "");
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/8-11708582-C-T/), {
      target: { value: "8-11708582-C-T" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/results?variants=8-11708582-C-T"),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("condition");
  });

  /** Text that was never picked from the list doesn't filter, same as an empty field. */
  it("ignores typed-but-unpicked text", async () => {
    stubApi([], "");
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/8-11708582-C-T/), {
      target: { value: "8-11708582-C-T" },
    });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "  diabetes  " } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/results?variants=8-11708582-C-T"),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("condition");
  });
});
