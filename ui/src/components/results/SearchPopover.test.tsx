import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchPopover from "./SearchPopover";

function renderPopover(props: Partial<Parameters<typeof SearchPopover>[0]> = {}) {
  const handlers = {
    onVariantsChange: vi.fn(),
    onConditionChange: vi.fn(),
    onConditionSelect: vi.fn(),
    onCancel: vi.fn(),
    onSearch: vi.fn(),
  };
  render(
    <SearchPopover
      open
      variantsText=""
      conditionText=""
      initialCondition={null}
      variantsLimit={50}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

const variantLines = (count: number) => Array.from({ length: count }, (_, index) => `1-${index + 1}-A-G`).join("\n");

describe("SearchPopover", () => {
  afterEach(cleanup);

  it("lays out the entry page's two steps, without their cards", () => {
    renderPopover({ variantsText: "8-11708582-C-T\n8-11708590-G-GAA" });

    expect(screen.getByRole("heading", { name: "Candidate variants" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Phenotype" })).toBeInTheDocument();
    expect(screen.getByText("2 entered")).toBeInTheDocument();
    expect(screen.getByText("limit 50")).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "e.g. tetralogy of fallot");
  });

  it("searches and cancels", () => {
    const { onSearch, onCancel } = renderPopover({ variantsText: "8-11708582-C-T" });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables search with no variants", () => {
    renderPopover({ variantsText: "\n  \n" });

    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("disables search above the limit, and says how many to remove", () => {
    renderPopover({ variantsText: variantLines(52) });

    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
    expect(screen.getByText("52 entered")).toHaveAttribute("title", "Search is limited to 50 variants.");
    expect(screen.getByText("52 variants entered. Remove 2 to search (limit 50).")).toBeInTheDocument();
  });

  it("restores the variants field's grey border after it loses focus", () => {
    renderPopover();
    const textarea = screen.getByRole("textbox", { name: "Candidate variants" });

    fireEvent.focus(textarea);
    fireEvent.blur(textarea);

    expect(textarea.style.borderColor).toBe("rgb(199, 198, 192)");
  });

  it("is hidden while closed", () => {
    renderPopover({ open: false });

    expect(screen.queryByRole("dialog", { name: "Edit search" })).not.toBeInTheDocument();
  });

  it("puts focus in the variants field when it opens", () => {
    renderPopover();

    expect(screen.getByRole("textbox", { name: "Candidate variants" })).toHaveFocus();
  });

  it("cancels on Escape and on a click on the backdrop", () => {
    const { onCancel } = renderPopover();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("searchPopoverBackdrop"));
    fireEvent.click(screen.getByRole("dialog", { name: "Edit search" }));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("leaves an Escape that something inside already handled, e.g. closing the condition dropdown", () => {
    const { onCancel } = renderPopover();

    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    event.preventDefault();
    document.dispatchEvent(event);

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("stops listening for Escape once closed", () => {
    const { onCancel } = renderPopover({ open: false });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).not.toHaveBeenCalled();
  });
});
