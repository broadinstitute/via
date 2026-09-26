import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import colors, { alpha } from "../../libs/colors";
import * as Style from "../../libs/style";
import type { ConditionConcept } from "../../api/conditions";
import { overLimitMessage, variantEntryStatus } from "../../utils/variants";
import Clickable from "../common/Clickable";
import { SearchIcon } from "../icons";
import PhenotypeStep from "../PhenotypeStep";
import SearchSteps from "../SearchSteps";
import VariantsStep from "../VariantsStep";
import { TOP_BAR_HEIGHT } from "./TopBar";

const styles = {
  // Dims the results behind the popover; clicking it cancels, like clicking off any popover.
  // Starts below the top bar, so the search box the popover hangs from stays undimmed. That
  // relies on the bar being sticky: if it scrolled away, this would leave an undimmed strip.
  backdrop: {
    position: "fixed",
    top: TOP_BAR_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    background: alpha(colors.textPrimary, 0.18),
  },
  // Hangs from TopBar's anchor around the search box, left-aligned with it. The max width keeps
  // it on screen when the window is narrower than the popover plus the box's offset from the
  // left edge (the back button and bar padding, ~70px).
  popover: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    zIndex: 1,
    width: 760,
    maxWidth: "calc(100vw - 88px)",
    padding: 16,
    background: colors.surface2,
    border: `1px solid ${colors.border}`,
    borderRadius: Style.panelRadius,
    boxShadow: Style.shadows.raised,
    cursor: "auto",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTop: `1px solid ${colors.border}`,
  },
  error: {
    marginRight: "auto",
    color: colors.textDanger,
    fontSize: 12.5,
    fontWeight: 600,
  },
} as const satisfies Record<string, CSSProperties>;

interface SearchPopoverProps {
  open: boolean;
  variantsText: string;
  conditionText: string;
  /** The concept the page was searched with, shown as already picked. */
  initialCondition: ConditionConcept | null;
  variantsLimit: number;
  onVariantsChange: (value: string) => void;
  /** Same contract as ConditionSearchField: fires before onConditionSelect on a pick. */
  onConditionChange: (value: string) => void;
  onConditionSelect: (concept: ConditionConcept) => void;
  /** Also fired by Escape and by clicking the backdrop. */
  onCancel: () => void;
  onSearch: () => void;
}

/**
 * The results page's edit-search form, as a popover hanging from the top bar's search box.
 * Rendered by TopBar inside its anchor. Stays mounted while closed (hidden), so the fields
 * keep their state between openings; the page remounts it to reset them.
 */
export default function SearchPopover({
  open,
  variantsText,
  conditionText,
  initialCondition,
  variantsLimit,
  onVariantsChange,
  onConditionChange,
  onConditionSelect,
  onCancel,
  onSearch,
}: SearchPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { count: enteredCount, overLimit, canSearch } = variantEntryStatus(variantsText, variantsLimit);

  // Starts you in the variants field, the usual thing to edit.
  useEffect(() => {
    if (open) popoverRef.current?.querySelector("textarea")?.focus();
  }, [open]);

  // On the document so it works wherever focus is. An Escape the condition field used to close
  // its dropdown arrives already handled (defaultPrevented), and only closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  return (
    <div style={{ display: open ? "block" : "none" }}>
      <div style={styles.backdrop} onClick={onCancel} aria-hidden="true" data-testid="searchPopoverBackdrop" />
      <div ref={popoverRef} role="dialog" aria-label="Edit search" style={styles.popover}>
        <SearchSteps>
          <VariantsStep
            value={variantsText}
            onChange={onVariantsChange}
            limit={variantsLimit}
            minHeight={120}
            appearance="plain"
          />
          <PhenotypeStep
            id="editSearchCondition"
            value={conditionText}
            initialSelection={initialCondition}
            onChange={onConditionChange}
            onSelect={onConditionSelect}
            appearance="plain"
          />
        </SearchSteps>

        <div style={styles.actions}>
          {overLimit && (
            <p style={styles.error} aria-live="polite">
              {overLimitMessage(enteredCount, variantsLimit)}
            </p>
          )}
          <Clickable style={Style.buttons.secondary} hoverStyle={Style.buttons.secondaryHover} onClick={onCancel}>
            Cancel
          </Clickable>
          <Clickable
            style={Style.buttons.primary}
            hoverStyle={Style.buttons.primaryHover}
            disabledStyle={Style.buttons.disabled}
            disabled={!canSearch}
            onClick={onSearch}
          >
            <SearchIcon size={14} aria-hidden="true" />
            Search
          </Clickable>
        </div>
      </div>
    </div>
  );
}
