import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useHasMoreBelow } from "./hooks";

function Scroller() {
  const ref = useRef<HTMLDivElement>(null);
  const hasMoreBelow = useHasMoreBelow(ref);
  return (
    <div ref={ref} data-testid="scroller">
      {hasMoreBelow ? "more" : "end"}
    </div>
  );
}

/** jsdom does no layout, so the scroll geometry is set by hand and a scroll event re-reads it. */
function scrollTo(element: HTMLElement, { scrollTop, clientHeight = 200, scrollHeight = 1000 }: {
  scrollTop: number;
  clientHeight?: number;
  scrollHeight?: number;
}) {
  Object.defineProperty(element, "clientHeight", { configurable: true, value: clientHeight });
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: scrollHeight });
  element.scrollTop = scrollTop;
  act(() => {
    fireEvent.scroll(element);
  });
}

describe("useHasMoreBelow", () => {
  afterEach(cleanup);

  it("is false when the content fits", () => {
    render(<Scroller />);

    expect(screen.getByTestId("scroller")).toHaveTextContent("end");
  });

  it("tracks whether anything is left below as the container scrolls", () => {
    render(<Scroller />);
    const scroller = screen.getByTestId("scroller");

    scrollTo(scroller, { scrollTop: 0 });
    expect(scroller).toHaveTextContent("more");

    scrollTo(scroller, { scrollTop: 400 });
    expect(scroller).toHaveTextContent("more");

    scrollTo(scroller, { scrollTop: 800 });
    expect(scroller).toHaveTextContent("end");
  });

  it("allows a pixel of slack for fractional scroll positions", () => {
    render(<Scroller />);
    const scroller = screen.getByTestId("scroller");

    scrollTo(scroller, { scrollTop: 799.5 });

    expect(scroller).toHaveTextContent("end");
  });
});
