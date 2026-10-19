import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchBox, { describePhenotypeBadge } from "./SearchBox";

describe("SearchBox", () => {
  afterEach(cleanup);

  it("renders the loaded search summary", () => {
    render(<SearchBox variantsEnteredCount={17} phenotypes={["Seizure"]} onModifySearch={vi.fn()} />);

    expect(screen.getByText("17 entered")).toBeInTheDocument();
    expect(screen.getByText("Seizure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit search" })).toBeEnabled();
  });

  it("opens the drawer from anywhere in the box, which describes the current terms", () => {
    const onModifySearch = vi.fn();
    const { rerender } = render(
      <SearchBox variantsEnteredCount={3} phenotypes={["Long QT syndrome"]} onModifySearch={onModifySearch} />,
    );

    const box = screen.getByRole("button", { name: "Edit search" });
    expect(box).toHaveAccessibleDescription(/Variants\s*3 entered\s*Phenotype\s*Long QT syndrome/);
    expect(box).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByText("Long QT syndrome"));
    expect(onModifySearch).toHaveBeenCalledTimes(1);

    rerender(<SearchBox variantsEnteredCount={3} phenotypes={["Long QT syndrome"]} onModifySearch={onModifySearch} modifyOpen />);
    expect(box).toHaveAttribute("aria-expanded", "true");
  });

  it("returns focus to the box when the drawer closes, but doesn't take it on first render", () => {
    const { rerender } = render(<SearchBox variantsEnteredCount={1} onModifySearch={vi.fn()} />);
    const box = screen.getByRole("button", { name: "Edit search" });
    expect(box).not.toHaveFocus();

    rerender(<SearchBox variantsEnteredCount={1} onModifySearch={vi.fn()} modifyOpen />);
    rerender(<SearchBox variantsEnteredCount={1} onModifySearch={vi.fn()} />);
    expect(box).toHaveFocus();
  });

  it("goes back to its grey border after a hover", () => {
    render(<SearchBox variantsEnteredCount={1} onModifySearch={vi.fn()} />);
    const box = screen.getByRole("button", { name: "Edit search" });
    const resting = box.style.borderColor;

    fireEvent.mouseEnter(box);
    expect(box.style.borderColor).not.toBe(resting);
    fireEvent.mouseLeave(box);
    expect(box.style.borderColor).toBe(resting);
  });

  it("names two conditions as alternatives, and a long list by its first and how many more", () => {
    render(
      <SearchBox
        variantsEnteredCount={1}
        phenotypes={["Hypertrophic cardiomyopathy", "Long QT syndrome", "Brugada syndrome"]}
        onModifySearch={vi.fn()}
      />,
    );
    expect(screen.getByText("Hypertrophic cardiomyopathy +2 more")).toHaveAttribute(
      "title",
      "Hypertrophic cardiomyopathy, Long QT syndrome or Brugada syndrome",
    );
  });

  it("renders the fallback phenotype label when no condition is set", () => {
    render(<SearchBox variantsEnteredCount={1} onModifySearch={vi.fn()} />);
    expect(screen.getByText("None entered")).not.toHaveAttribute("title");
  });

  it("renders loading skeletons and disables the box while loading", () => {
    render(<SearchBox loading variantsEnteredCount={0} onModifySearch={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Edit search" })).toBeDisabled();
    expect(screen.queryByText("0 entered")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-skeleton-pulse")).toHaveLength(2);
  });

  it("renders the edit panel under the box", () => {
    render(<SearchBox variantsEnteredCount={1} onModifySearch={vi.fn()} editSearchPanel={<div>the popover</div>} />);
    expect(screen.getByText("the popover")).toBeInTheDocument();
  });

  describe("at narrow width", () => {
    const matchMedia = window.matchMedia;
    afterEach(() => {
      window.matchMedia = matchMedia;
    });
    const narrow = () => {
      window.matchMedia = (query: string) => ({ ...matchMedia(query), matches: query.includes("860px") });
    };

    it("shows a variant count without its label, and drops an empty phenotype", () => {
      narrow();
      render(<SearchBox variantsEnteredCount={1} onModifySearch={vi.fn()} />);
      expect(screen.getByText("1 variant")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit search" })).toHaveAccessibleDescription(/Variants\s*1 variant\s*Phenotype\s*None entered/);
    });

    it("keeps a picked phenotype, pluralizing the count", () => {
      narrow();
      render(<SearchBox variantsEnteredCount={2} phenotypes={["Seizure"]} onModifySearch={vi.fn()} />);
      expect(screen.getByText("2 variants")).toBeInTheDocument();
      expect(screen.getByText("Seizure")).toBeInTheDocument();
    });
  });
});

describe("describePhenotypeBadge", () => {
  it("says None entered with no tooltip, one name whole, two as alternatives, and many by the first", () => {
    expect(describePhenotypeBadge([])).toEqual({ label: "None entered", title: undefined });
    expect(describePhenotypeBadge(["Seizure"])).toEqual({ label: "Seizure", title: "Seizure" });
    expect(describePhenotypeBadge(["Seizure", "Long QT syndrome"])).toEqual({
      label: "Seizure or Long QT syndrome",
      title: "Seizure or Long QT syndrome",
    });
    expect(describePhenotypeBadge(["Hypertrophic cardiomyopathy", "Long QT syndrome"])).toEqual({
      label: "Hypertrophic cardiomyopathy +1 more",
      title: "Hypertrophic cardiomyopathy or Long QT syndrome",
    });
  });
});
