import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConditionSearchField from "./ConditionSearchField";

const TETRALOGY = { conceptId: 9000010, name: "Tetralogy of Fallot", estimatedParticipantCount: 47 };
const REPAIRED = { conceptId: 9000018, name: "Fallot tetralogy, repaired", estimatedParticipantCount: 8 };
const NO_ESTIMATE = { conceptId: 9000016, name: "Tetralogy of Fallot in adult", estimatedParticipantCount: null };

const PAST_DEBOUNCE_MS = 1200;
configure({ asyncUtilTimeout: 2500 });

function mockCandidates(term: string, candidates: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ term, candidates }),
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("ConditionSearchField", () => {
  const realScrollIntoView = Element.prototype.scrollIntoView;

  afterEach(() => {
    Element.prototype.scrollIntoView = realScrollIntoView;
    cleanup();
    vi.unstubAllGlobals();
  });

  function renderField(props: Partial<React.ComponentProps<typeof ConditionSearchField>> = {}) {
    const onChange = props.onChange ?? vi.fn();
    render(<ConditionSearchField id="condition" value="" onChange={onChange} {...props} />);
    return { onChange };
  }

  /** Renders with a term already typed and the field focused. */
  function renderOpen(
    candidates: unknown[],
    props: Partial<React.ComponentProps<typeof ConditionSearchField>> = {},
  ) {
    const fetchMock = mockCandidates("tetralogy", candidates);
    vi.stubGlobal("fetch", fetchMock);
    const rendered = renderField({ value: "tetralogy", ...props });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    return { input, fetchMock, ...rendered };
  }

  it("renders as a combobox that starts collapsed", () => {
    renderField();

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  /**
   * Substring matching means one or two characters match nearly everything, so the field
   * doesn't query at all below the threshold. This also keeps BigQuery cost off the first
   * keystrokes of every search.
   */
  it("does not query below the minimum query length", async () => {
    const fetchMock = mockCandidates("te", []);
    vi.stubGlobal("fetch", fetchMock);

    renderField({ value: "te" });
    await wait(PAST_DEBOUNCE_MS);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("queries /api/condition once the term is long enough", async () => {
    const fetchMock = mockCandidates("tetr", [TETRALOGY]);
    vi.stubGlobal("fetch", fetchMock);

    renderField({ value: "tetr" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/condition?condition=tetr");
  });

  it("debounces, so typing a word is one request rather than one per letter", async () => {
    const fetchMock = mockCandidates("tetra", [TETRALOGY]);
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<ConditionSearchField id="condition" value="tet" onChange={vi.fn()} />);
    rerender(<ConditionSearchField id="condition" value="tetr" onChange={vi.fn()} />);
    rerender(<ConditionSearchField id="condition" value="tetra" onChange={vi.fn()} />);
    await wait(PAST_DEBOUNCE_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/condition?condition=tetra");
  });

  it("lists candidates with their estimates once focused", async () => {
    renderOpen([TETRALOGY, REPAIRED]);

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Tetralogy of Fallot");
    expect(options[0]).toHaveTextContent("47");
    expect(options[0]).toHaveAccessibleName("Tetralogy of Fallot, about 47 participants");
    expect(screen.getAllByTitle(/^Estimated participants with this condition/)).toHaveLength(2);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  /** est_count is nullable in cb_criteria, so the option still has to render. */
  it("labels a candidate with no estimate rather than showing a blank", async () => {
    renderOpen([NO_ESTIMATE]);

    const option = await screen.findByRole("option");
    expect(option).toHaveTextContent("—");
    expect(option).toHaveAccessibleName(`${NO_ESTIMATE.name}, no participant estimate`);
    expect(screen.getByTitle(/^No participant estimate/)).toBeInTheDocument();
  });

  it("reports the picked concept to the caller", async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    renderOpen([TETRALOGY, REPAIRED], { onChange, onSelect });

    fireEvent.mouseDown(await screen.findByText("Fallot tetralogy, repaired"));

    expect(onChange).toHaveBeenCalledWith("Fallot tetralogy, repaired");
    expect(onSelect).toHaveBeenCalledWith(REPAIRED);
  });

  it("closes the list after a pick", async () => {
    renderOpen([TETRALOGY]);

    fireEvent.mouseDown(await screen.findByText("Tetralogy of Fallot"));

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("reopens the same list when the field is clicked after a pick, so the pick can be changed", async () => {
    const onSelect = vi.fn();
    const { input, fetchMock } = renderOpen([TETRALOGY, REPAIRED], { onSelect });

    fireEvent.mouseDown(await screen.findByText("Tetralogy of Fallot"));
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());

    // The field kept focus through the pick, so this is a click with no focus event.
    fireEvent.click(input);
    fireEvent.mouseDown(await screen.findByText("Fallot tetralogy, repaired"));

    expect(onSelect).toHaveBeenLastCalledWith(REPAIRED);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("looks up the initial selection's name when focused, since there's no list yet to reopen", async () => {
    const fetchMock = mockCandidates("Tetralogy of Fallot", [TETRALOGY, REPAIRED]);
    vi.stubGlobal("fetch", fetchMock);
    renderField({ value: "Tetralogy of Fallot", initialSelection: TETRALOGY });
    await wait(PAST_DEBOUNCE_MS);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.focus(screen.getByRole("combobox"));

    expect(screen.getByText("Searching…")).toBeInTheDocument();
    expect(await screen.findAllByRole("option")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't repeat a lookup that found nothing when the field is refocused", async () => {
    const fetchMock = mockCandidates("zzzz", []);
    vi.stubGlobal("fetch", fetchMock);
    renderField({ value: "zzzz" });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.click(input);
    await wait(PAST_DEBOUNCE_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("moves through the list with the arrow keys and picks with Enter", async () => {
    const onChange = vi.fn();
    const { input } = renderOpen([TETRALOGY, REPAIRED], { onChange });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("Fallot tetralogy, repaired");
  });

  /**
   * The listbox caps at 260px and scrolls, so arrowing past the last visible row would
   * otherwise move the highlight somewhere the user can't see.
   */
  it("scrolls the highlighted option into view", async () => {
    const scrollIntoView = vi.fn();
    // jsdom doesn't implement scrollIntoView at all, so it has to be installed to be observed.
    Element.prototype.scrollIntoView = scrollIntoView;

    const { input } = renderOpen([TETRALOGY, REPAIRED]);
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("wraps from the last option back to the first", async () => {
    const onChange = vi.fn();
    const { input } = renderOpen([TETRALOGY, REPAIRED], { onChange });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("Tetralogy of Fallot");
  });

  /** Enter with nothing highlighted must stay available to submit the form. */
  it("does not swallow Enter when no option is highlighted", async () => {
    const onChange = vi.fn();
    const { input } = renderOpen([TETRALOGY], { onChange });
    await screen.findAllByRole("option");

    const notPrevented = fireEvent.keyDown(input, { key: "Enter" });

    expect(notPrevented).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes the list on Escape without changing the value", async () => {
    const onChange = vi.fn();
    const { input } = renderOpen([TETRALOGY], { onChange });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("says no matching conditions when nothing matches", async () => {
    vi.stubGlobal("fetch", mockCandidates("asdfqwerty", []));
    renderField({ value: "asdfqwerty" });
    fireEvent.focus(screen.getByRole("combobox"));

    expect(await screen.findByText("No matching conditions")).toBeInTheDocument();
  });

  /**
   * A response for an older keystroke can outrun a newer one. The backend echoes the term back
   * precisely so the stale one can be recognised and dropped.
   */
  it("ignores a response whose term is not the current one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ term: "tetr", candidates: [TETRALOGY] }),
      }),
    );

    renderField({ value: "tetralogy" });
    fireEvent.focus(screen.getByRole("combobox"));
    await wait(PAST_DEBOUNCE_MS);

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("surfaces a failed lookup instead of silently showing nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    renderField({ value: "tetralogy" });
    fireEvent.focus(screen.getByRole("combobox"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load matching conditions.");
  });

  /**
   * A fast typist can otherwise leave a dozen queries in flight, and BigQuery bills per query,
   * not per rendered result. This query may already be in progress in the backend, but we can at least try...
   */
  it("aborts an in-flight request when the term changes", async () => {
    const fetchMock = mockCandidates("tetralogy", [TETRALOGY]);
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<ConditionSearchField id="condition" value="tetr" onChange={vi.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender(<ConditionSearchField id="condition" value="tetralogy" onChange={vi.fn()} />);

    const firstSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    await waitFor(() => expect(firstSignal.aborted).toBe(true));
  });
});
