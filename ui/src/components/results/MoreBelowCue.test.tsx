import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MoreBelowCue from "./MoreBelowCue";

function Harness({ rows }: { rows: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: "relative" }}>
      <div ref={ref} data-testid="scroller">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} data-row />
        ))}
      </div>
      <MoreBelowCue scrollRef={ref} rowSelector="[data-row]" />
    </div>
  );
}

/** jsdom does no layout: a 200px scroller over 40px rows, re-read on a scroll event. */
function setGeometry(scroller: HTMLElement, scrollTop: number, scrollHeight?: number) {
  const rows = Array.from(scroller.children) as HTMLElement[];
  Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 200 });
  Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: scrollHeight ?? rows.length * 40 });
  scroller.getBoundingClientRect = () => new DOMRect(0, 0, 500, 200);
  rows.forEach((row, index) => {
    row.getBoundingClientRect = () => new DOMRect(0, index * 40 - scroller.scrollTop, 500, 40);
  });
  scroller.scrollTop = scrollTop;
  act(() => {
    fireEvent.scroll(scroller);
  });
}

describe("MoreBelowCue", () => {
  afterEach(cleanup);

  it("renders nothing when the content fits", () => {
    render(<Harness rows={3} />);

    setGeometry(screen.getByTestId("scroller"), 0);

    expect(screen.queryByRole("button", { name: /more below/ })).not.toBeInTheDocument();
  });

  it("says how many rows are below, and scrolls most of a screenful when clicked", () => {
    render(<Harness rows={25} />);
    const scroller = screen.getByTestId("scroller");
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy;

    setGeometry(scroller, 0);
    fireEvent.click(screen.getByRole("button", { name: "20 more below" }));
    expect(scrollBy).toHaveBeenCalledWith({ top: 160, behavior: "smooth" });

    setGeometry(scroller, 800);
    expect(screen.queryByRole("button", { name: /more below/ })).not.toBeInTheDocument();
  });

  it("falls back to a plain label when what's below isn't a counted row", () => {
    render(<Harness rows={0} />);

    setGeometry(screen.getByTestId("scroller"), 0, 1000);

    expect(screen.getByRole("button", { name: "More below" })).toBeInTheDocument();
  });
});
