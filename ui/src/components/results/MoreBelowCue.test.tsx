import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MoreBelowCue from "./MoreBelowCue";

function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: "relative" }}>
      <div ref={ref} data-testid="scroller" />
      <MoreBelowCue scrollRef={ref} />
    </div>
  );
}

/** jsdom does no layout, so the geometry is set by hand and a scroll event re-reads it. */
function setGeometry(element: HTMLElement, scrollTop: number) {
  Object.defineProperty(element, "clientHeight", { configurable: true, value: 200 });
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: 1000 });
  element.scrollTop = scrollTop;
  act(() => {
    fireEvent.scroll(element);
  });
}

describe("MoreBelowCue", () => {
  afterEach(cleanup);

  it("renders nothing when the content fits", () => {
    render(<Harness />);

    expect(screen.queryByRole("button", { name: "More below" })).not.toBeInTheDocument();
  });

  it("shows while rows are hidden below, and scrolls most of a screenful when clicked", () => {
    render(<Harness />);
    const scroller = screen.getByTestId("scroller");
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy;

    setGeometry(scroller, 0);
    fireEvent.click(screen.getByRole("button", { name: "More below" }));
    expect(scrollBy).toHaveBeenCalledWith({ top: 160, behavior: "smooth" });

    setGeometry(scroller, 800);
    expect(screen.queryByRole("button", { name: "More below" })).not.toBeInTheDocument();
  });
});
