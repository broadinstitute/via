import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TopBar, { TOP_BAR_HEIGHT } from "./TopBar";

describe("TopBar", () => {
  afterEach(cleanup);

  it("names the view, says what it's for, and holds its actions, pinned to the top of the window", () => {
    render(
      <TopBar title="Usage" lede="What this session cost" actions={<button type="button">Export</button>}>
        <span>in between</span>
      </TopBar>,
    );
    const heading = screen.getByRole("heading", { level: 1, name: "Usage" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("What this session cost")).toBeInTheDocument();
    expect(screen.getByText("in between")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    const bar = heading.parentElement!;
    expect(bar).toHaveStyle({ position: "sticky", top: "0px", minHeight: `${TOP_BAR_HEIGHT}px` });
  });

  it("can be just a control, with no heading", () => {
    render(
      <TopBar>
        <button type="button">Edit search</button>
      </TopBar>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit search" })).toBeInTheDocument();
  });
});
