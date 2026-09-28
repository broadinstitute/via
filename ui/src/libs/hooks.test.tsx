import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useMoreBelow } from "./hooks";

const ROW_HEIGHT = 40;
const VISIBLE_HEIGHT = 200;

function Scroller({ rows, detailRows = 0 }: { rows: number; detailRows?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { hasMoreBelow, rowsBelow } = useMoreBelow(ref, "[data-row]");
  return (
    <>
      <output data-testid="state">{hasMoreBelow ? `more:${rowsBelow}` : "end"}</output>
      <div ref={ref} data-testid="scroller">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} data-row />
        ))}
        {/* Not a counted row, like a row's expanded detail. */}
        {Array.from({ length: detailRows }, (_, index) => (
          <div key={`detail-${index}`} />
        ))}
      </div>
    </>
  );
}

/**
 * jsdom does no layout, so the geometry is set by hand: a 200px-tall scroller over 40px rows
 * (and any uncounted children after them), laid out top to bottom. A scroll event re-reads it.
 */
function scrollTo(scroller: HTMLElement, scrollTop: number) {
  const children = Array.from(scroller.children) as HTMLElement[];
  Object.defineProperty(scroller, "clientHeight", { configurable: true, value: VISIBLE_HEIGHT });
  Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: children.length * ROW_HEIGHT });
  scroller.getBoundingClientRect = () => new DOMRect(0, 0, 500, VISIBLE_HEIGHT);
  children.forEach((child, index) => {
    child.getBoundingClientRect = () => new DOMRect(0, index * ROW_HEIGHT - scroller.scrollTop, 500, ROW_HEIGHT);
  });
  scroller.scrollTop = scrollTop;
  act(() => {
    fireEvent.scroll(scroller);
  });
}

describe("useMoreBelow", () => {
  afterEach(cleanup);

  it("reports nothing below when the content fits", () => {
    render(<Scroller rows={3} />);

    scrollTo(screen.getByTestId("scroller"), 0);

    expect(screen.getByTestId("state")).toHaveTextContent("end");
  });

  it("counts the rows still out of sight as the container scrolls", () => {
    render(<Scroller rows={20} />);
    const scroller = screen.getByTestId("scroller");

    // 5 of 20 rows fit in view.
    scrollTo(scroller, 0);
    expect(screen.getByTestId("state")).toHaveTextContent("more:15");

    scrollTo(scroller, 400);
    expect(screen.getByTestId("state")).toHaveTextContent("more:5");

    scrollTo(scroller, 600);
    expect(screen.getByTestId("state")).toHaveTextContent("end");
  });

  it("counts a row cut off by the bottom edge only once most of it is hidden", () => {
    render(<Scroller rows={20} />);
    const scroller = screen.getByTestId("scroller");

    // The 6th row is 30px in view, 10px hidden: not counted.
    scrollTo(scroller, 30);
    expect(screen.getByTestId("state")).toHaveTextContent("more:14");

    // Now 10px in view, 30px hidden: counted.
    scrollTo(scroller, 10);
    expect(screen.getByTestId("state")).toHaveTextContent("more:15");
  });

  it("still flags content below that isn't a counted row", () => {
    render(<Scroller rows={5} detailRows={3} />);

    scrollTo(screen.getByTestId("scroller"), 0);

    expect(screen.getByTestId("state")).toHaveTextContent("more:0");
  });

  it("allows a pixel of slack for fractional scroll positions", () => {
    render(<Scroller rows={20} />);

    scrollTo(screen.getByTestId("scroller"), 599.5);

    expect(screen.getByTestId("state")).toHaveTextContent("end");
  });
});
