import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTooltip } from "./useTooltip";

/** The smallest anchor: a button that only spreads the hook's props. */
function Anchor() {
  const ref = useRef<HTMLButtonElement>(null);
  const tooltip = useTooltip(ref, "Explains itself");
  return (
    <button ref={ref} type="button" data-hovered={tooltip.hovered} data-keyboard={tooltip.keyboardFocused} {...tooltip.anchorProps}>
      Anchor
      {tooltip.bubble}
    </button>
  );
}

describe("useTooltip's anchor props", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("show on focus without the hover delay, and hide on blur", async () => {
    render(<Anchor />);
    const anchor = screen.getByRole("button");

    fireEvent.focus(anchor);
    expect(await screen.findByTestId("infoTooltip")).toHaveTextContent("Explains itself");

    fireEvent.blur(anchor);
    expect(screen.queryByTestId("infoTooltip")).not.toBeInTheDocument();
  });

  it("show on click at once, and on hover only after the delay", () => {
    vi.useFakeTimers();
    render(<Anchor />);
    const anchor = screen.getByRole("button");

    fireEvent.mouseEnter(anchor);
    expect(anchor).toHaveAttribute("data-hovered", "true");
    // Short of the delay: nothing yet. Past it: shown.
    act(() => vi.advanceTimersByTime(50));
    expect(screen.queryByTestId("infoTooltip")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByTestId("infoTooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(anchor);
    expect(anchor).toHaveAttribute("data-hovered", "false");
    expect(screen.queryByTestId("infoTooltip")).not.toBeInTheDocument();

    // A click shows at once: only the zero-delay timer stands between it and the bubble.
    fireEvent.click(anchor);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByTestId("infoTooltip")).toBeInTheDocument();
  });

  it("keep the tooltip while keyboard focus remains after the pointer leaves, and hide on blur", async () => {
    render(<Anchor />);
    const anchor = screen.getByRole("button");
    vi.spyOn(anchor, "matches").mockReturnValue(true);

    fireEvent.focus(anchor);
    expect(await screen.findByTestId("infoTooltip")).toBeInTheDocument();
    fireEvent.mouseEnter(anchor);
    fireEvent.mouseLeave(anchor);
    expect(screen.getByTestId("infoTooltip")).toBeInTheDocument();

    fireEvent.blur(anchor);
    expect(screen.queryByTestId("infoTooltip")).not.toBeInTheDocument();
  });

  it("keep the tooltip while the pointer remains after blur, and hide when it leaves", async () => {
    render(<Anchor />);
    const anchor = screen.getByRole("button");

    fireEvent.mouseEnter(anchor);
    fireEvent.focus(anchor);
    expect(await screen.findByTestId("infoTooltip")).toBeInTheDocument();
    fireEvent.blur(anchor);
    expect(screen.getByTestId("infoTooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(anchor);
    expect(screen.queryByTestId("infoTooltip")).not.toBeInTheDocument();
  });

  it("still close on leaving after a click, since mouse focus doesn't pin the tooltip", async () => {
    render(<Anchor />);
    const anchor = screen.getByRole("button");
    vi.spyOn(anchor, "matches").mockReturnValue(false);

    fireEvent.mouseEnter(anchor);
    fireEvent.focus(anchor); // what a click does to a button
    expect(await screen.findByTestId("infoTooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(anchor);
    expect(screen.queryByTestId("infoTooltip")).not.toBeInTheDocument();
  });

  it("report keyboard focus only when the browser would draw a focus ring", () => {
    render(<Anchor />);
    const anchor = screen.getByRole("button");

    vi.spyOn(anchor, "matches").mockReturnValue(false);
    fireEvent.focus(anchor);
    expect(anchor).toHaveAttribute("data-keyboard", "false");
    fireEvent.blur(anchor);

    vi.spyOn(anchor, "matches").mockReturnValue(true);
    fireEvent.focus(anchor);
    expect(anchor).toHaveAttribute("data-keyboard", "true");
  });
});
